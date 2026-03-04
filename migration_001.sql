-- ============================================================
-- DecisionOS — Full Schema (Fresh Install)
-- Run this in the Supabase SQL Editor.
-- WARNING: Drops all existing tables. Safe only on a clean DB.
-- ============================================================


-- ==========================================
-- 0. EXTENSIONS
-- ==========================================

CREATE EXTENSION IF NOT EXISTS vector;


-- ==========================================
-- 1. DROP EXISTING (clean slate)
-- ==========================================

DROP TABLE IF EXISTS integrations       CASCADE;
DROP TABLE IF EXISTS commitments         CASCADE;
DROP TABLE IF EXISTS decisions           CASCADE;
DROP TABLE IF EXISTS ingestion_events    CASCADE;
DROP TABLE IF EXISTS users              CASCADE;
DROP TABLE IF EXISTS organizations       CASCADE;


-- ==========================================
-- 2. ORGANIZATIONS
-- ==========================================

CREATE TABLE organizations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- 3. USERS
-- Maps to Supabase Auth users.
-- ==========================================

CREATE TABLE users (
    id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id                UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email                 TEXT UNIQUE NOT NULL,
    role                  TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',

    -- Onboarding state
    onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
    github_connected      BOOLEAN NOT NULL DEFAULT FALSE,
    gmail_connected       BOOLEAN NOT NULL DEFAULT FALSE,
    calendar_connected    BOOLEAN NOT NULL DEFAULT FALSE,

    created_at            TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- 4. DECISIONS
-- ==========================================

CREATE TABLE decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    creator_id      UUID REFERENCES users(id),

    title           TEXT NOT NULL,
    summary         TEXT NOT NULL,
    status          TEXT CHECK (status IN ('pending', 'approved', 'critical', 'rejected', 'resolved')) DEFAULT 'pending',

    -- Source traceability
    source_platform TEXT CHECK (source_platform IN ('github', 'gmail', 'calendar', 'manual', 'slack')),
    source_url      TEXT,

    -- pgvector embedding (Gemini text-embedding-004 = 768 dimensions)
    embedding       vector(768),

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);


-- ==========================================
-- 5. COMMITMENTS (Action Items)
-- ==========================================

CREATE TABLE commitments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE NOT NULL,
    org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    owner_id    UUID REFERENCES users(id),
    owner_name  TEXT NOT NULL,
    description TEXT NOT NULL,
    status      TEXT CHECK (status IN ('open', 'completed', 'blocked', 'canceled')) DEFAULT 'open',
    deadline    TIMESTAMPTZ,

    created_at  TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);


-- ==========================================
-- 6. INTEGRATIONS (OAuth Tokens)
-- Tokens are AES-256 encrypted by the API before insert.
-- Raw token is never stored in plaintext.
-- ==========================================

CREATE TABLE integrations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id            UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    owner_id          UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

    platform          TEXT NOT NULL CHECK (platform IN ('github', 'gmail', 'calendar')),

    -- AES-256-GCM encrypted by API layer
    access_token      TEXT NOT NULL,
    refresh_token     TEXT,
    token_expires_at  TIMESTAMPTZ,
    scope             TEXT,

    external_user_id  TEXT,
    external_username TEXT,

    -- Chosen at onboarding: 7, 30, or 0 (fresh start)
    data_range_days   INTEGER NOT NULL DEFAULT 30 CHECK (data_range_days IN (7, 30, 0)),

    sync_status       TEXT CHECK (sync_status IN ('idle', 'syncing', 'error')) DEFAULT 'idle',
    last_synced_at    TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (org_id, platform)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- 7. INGESTION EVENTS (Ephemeral Queue Log)
-- Raw payloads are deleted after processing.
-- This table is a status log only — not long-term storage.
-- ==========================================

CREATE TABLE ingestion_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    platform    TEXT NOT NULL,
    status      TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    error_log   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
    -- NOTE: raw_payload column intentionally omitted — raw data is never persisted
);


-- ==========================================
-- 8. ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_events   ENABLE ROW LEVEL SECURITY;

-- Isolation policy: users can only see rows in their own org
CREATE POLICY tenant_isolation_decisions ON decisions
    FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_commitments ON commitments
    FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_integrations ON integrations
    FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_ingestion ON ingestion_events
    FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));


-- ==========================================
-- 9. VECTOR SEARCH RPC
-- Used by the AI Copilot to find relevant past decisions.
-- ==========================================

CREATE OR REPLACE FUNCTION match_decisions(
    query_embedding  vector(768),
    match_threshold  FLOAT,
    match_count      INT,
    p_org_id         UUID
)
RETURNS TABLE (
    id          UUID,
    title       TEXT,
    summary     TEXT,
    status      TEXT,
    source_url  TEXT,
    created_at  TIMESTAMPTZ,
    similarity  FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id, d.title, d.summary, d.status, d.source_url, d.created_at,
        (1 - (d.embedding <=> query_embedding))::FLOAT AS similarity
    FROM decisions d
    WHERE d.org_id = p_org_id
      AND d.embedding IS NOT NULL
      AND (1 - (d.embedding <=> query_embedding)) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


-- ==========================================
-- 10. AUTH TRIGGERS
-- Automatically create an org and public.user record on signup.
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- 1. Create a default organization
    INSERT INTO public.organizations (name)
    VALUES (NEW.email || '''s Org')
    RETURNING id INTO new_org_id;

    -- 2. Create the public.users record
    INSERT INTO public.users (id, org_id, email, role)
    VALUES (NEW.id, new_org_id, NEW.email, 'owner');

    -- 3. Sync org_id back to auth.users metadata so JWTs have it
    -- Note: This only affects FUTURE tokens. Current session needs a refresh.
    UPDATE auth.users 
    SET raw_user_meta_data = 
        coalesce(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object('org_id', new_org_id)
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 11. FIX EXISTING USERS
-- Run this once to fix users who signed up before the trigger.
-- ==========================================

DO $$
DECLARE
    u RECORD;
    new_org_id UUID;
BEGIN
    FOR u IN SELECT id, email FROM auth.users WHERE id NOT IN (SELECT id FROM public.users) LOOP
        -- Create org
        INSERT INTO public.organizations (name)
        VALUES (u.email || '''s Org')
        RETURNING id INTO new_org_id;

        -- Create public user
        INSERT INTO public.users (id, org_id, email, role)
        VALUES (u.id, new_org_id, u.email, 'owner');

        -- Update metadata
        UPDATE auth.users 
        SET raw_user_meta_data = 
            coalesce(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object('org_id', new_org_id)
        WHERE id = u.id;
    END LOOP;
END $$;


-- ==========================================
-- 12. FINISH
-- ==========================================

NOTIFY pgrst, 'reload schema';
