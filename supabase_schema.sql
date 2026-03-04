-- Enable the vector extension for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- 1. CORE MULTI-TENANCY
-- ==========================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    -- Maps exactly to Supabase Auth's user UUID
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user must belong to an org
    CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- ==========================================
-- 2. THE DECISION ENGINE
-- ==========================================

CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES users(id),
    
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'resolved')) DEFAULT 'pending',
    
    -- Traceability back to the tool
    source_platform TEXT CHECK (source_platform IN ('slack', 'github', 'email', 'manual')),
    source_url TEXT, -- e.g., the direct link to the Slack thread
    
    -- RAG Vector Embedding (Using 768 dimensions for models like Nomic)
    embedding vector(768),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ==========================================
-- 3. THE COMMITMENT LAYER (Action Items)
-- ==========================================

CREATE TABLE commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    
    -- Who owns this? (Can be a platform user, or a raw string if it's an external person)
    owner_id UUID REFERENCES users(id),
    owner_name TEXT NOT NULL, 
    
    description TEXT NOT NULL,
    status TEXT CHECK (status IN ('open', 'completed', 'blocked', 'canceled')) DEFAULT 'open',
    deadline TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ==========================================
-- 4. INGESTION QUEUE (Ephemeral Data)
-- ==========================================

CREATE TABLE ingestion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    
    platform TEXT NOT NULL,
    raw_payload JSONB NOT NULL, -- The messy Slack/GitHub webhook data
    
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    error_log TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. ROW LEVEL SECURITY (The Privacy Moat)
-- ==========================================

-- 1. Force RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_events ENABLE ROW LEVEL SECURITY;

-- 2. Create the isolation policy: "Users can only see data where org_id matches their own org_id"
-- (Note: In Supabase, you extract the user's ID using auth.uid())

CREATE POLICY tenant_isolation_decisions ON decisions
    FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_commitments ON commitments
    FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Even if your backend logic has a bug, the Postgres kernel will drop cross-tenant reads entirely.
