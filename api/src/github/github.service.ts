import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { AiSieveService } from '../common/ai-sieve.service';
import { GoogleGenAI } from '@google/genai';
import * as crypto from 'crypto';

@Injectable()
export class GithubService {
    private readonly logger = new Logger(GithubService.name);
    private readonly ai_google: GoogleGenAI;
    private readonly ALGORITHM = 'aes-256-gcm';

    constructor(
        private supabaseService: SupabaseService,
        private configService: ConfigService,
        private aiSieve: AiSieveService,
    ) {
        this.ai_google = new GoogleGenAI({
            apiKey: this.configService.get<string>('GEMINI_API_KEY'),
        });
    }

    // ─────────────────────────────────────────────────────────────
    // OAuth: Exchange code → store encrypted token
    // ─────────────────────────────────────────────────────────────

    async connectGithub(
        org_id: string,
        owner_id: string,
        code: string,
        dataRangeDays: number,
        redirectUri?: string
    ): Promise<{ username: string }> {
        this.logger.log(`[GithubService] Starting OAuth exchange. client_id=${this.configService.get('GITHUB_CLIENT_ID')} redirect_uri=${redirectUri}`);

        // 1. Exchange OAuth code for GitHub access token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                client_id: this.configService.get<string>('GITHUB_CLIENT_ID'),
                client_secret: this.configService.get<string>('GITHUB_CLIENT_SECRET'),
                code,
                redirect_uri: redirectUri,
            }),
        });

        const tokenData = await tokenRes.json() as any;
        this.logger.log(`[GithubService] Token response: ${JSON.stringify(tokenData)}`);

        if (!tokenData.access_token) {
            this.logger.error(`[GithubService] GitHub OAuth failed. Error: ${tokenData.error}, Description: ${tokenData.error_description}`);
            throw new Error(`GitHub OAuth failed: ${tokenData.error_description || 'no access token returned'}`);
        }

        // 2. Fetch GitHub username to display & use as external_user_id
        const userRes = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const ghUser = await userRes.json() as { login: string; id: number; message?: string };
        this.logger.log(`[GithubService] User response: ${JSON.stringify(ghUser)}`);

        if (ghUser.message) {
            this.logger.error(`[GithubService] Failed to fetch GitHub user: ${ghUser.message}`);
            throw new Error(`Failed to fetch GitHub user: ${ghUser.message}`);
        }

        this.logger.log(`[GithubService] OrgID: ${org_id}, OwnerID: ${owner_id}`);

        if (!org_id) throw new Error('User has no org_id — complete org setup first');

        // 3. Encrypt the access token before storage
        const encryptedToken = this.encrypt(tokenData.access_token);

        // 5. Upsert into integrations table
        const adminClient = this.supabaseService.getAdminClient();
        const { error: upsertError } = await adminClient.from('integrations').upsert({
            org_id,
            owner_id,
            platform: 'github',
            access_token: encryptedToken,
            scope: tokenData.scope,
            external_user_id: String(ghUser.id),
            external_username: ghUser.login,
            data_range_days: dataRangeDays,
            sync_status: 'idle',
        }, { onConflict: 'org_id,platform' });

        if (upsertError) {
            this.logger.error('[GithubService] Upsert error:', upsertError);
            throw upsertError;
        }

        // 6. Update user.github_connected flag
        await adminClient.from('users').update({ github_connected: true }).eq('id', owner_id);

        // 7. Queue backfill job (non-blocking)
        this.queueBackfill(org_id, ghUser.login, tokenData.access_token, dataRangeDays).catch(err =>
            this.logger.error('Backfill queue failed (non-fatal)', err),
        );

        return { username: ghUser.login };
    }

    private async queueBackfill(orgId: string, username: string, accessToken: string, rangeDays: number) {
        if (rangeDays === 0) {
            this.logger.log(`org=${orgId} chose "start fresh" — skipping backfill`);
            return;
        }
        // Calculate since date
        const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
        this.logger.log(`Queueing GitHub backfill for org=${orgId} since ${since}`);
        // Backfill runs synchronously here for simplicity (small set of data)
        // In production this would be a pg-boss job
        await this.processBackfill(orgId, username, accessToken, since);
    }

    // ─────────────────────────────────────────────────────────────
    // Backfill: Fetch closed PRs and issues from GitHub
    // ─────────────────────────────────────────────────────────────

    async processBackfill(orgId: string, username: string, accessToken: string, since: string) {
        const adminClient = this.supabaseService.getAdminClient();

        // Update sync status
        await adminClient.from('integrations')
            .update({ sync_status: 'syncing' })
            .eq('org_id', orgId)
            .eq('platform', 'github');

        try {
            // Fetch repos user has access to, including their permissions
            const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=pushed', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const repos = await reposRes.json() as Array<{
                full_name: string;
                permissions: { admin: boolean; maintain: boolean; push: boolean; triage: boolean; pull: boolean }
            }>;

            // Extract lightweight permissions payload to store
            const reposPermissions = repos.map(repo => ({
                full_name: repo.full_name,
                permissions: repo.permissions
            }));

            // Save the repository permissions to the integration record
            await adminClient.from('integrations')
                .update({ repos_permissions: reposPermissions })
                .eq('org_id', orgId)
                .eq('platform', 'github');

            for (const repo of repos) {
                await this.processRepoDecisions(orgId, repo.full_name, accessToken, since);
            }

            await adminClient.from('integrations')
                .update({ sync_status: 'idle', last_synced_at: new Date().toISOString() })
                .eq('org_id', orgId)
                .eq('platform', 'github');

        } catch (err) {
            this.logger.error(`Backfill failed for org=${orgId}`, err);
            await adminClient.from('integrations')
                .update({ sync_status: 'error' })
                .eq('org_id', orgId)
                .eq('platform', 'github');
        }
    }

    private async processRepoDecisions(orgId: string, repoFullName: string, accessToken: string, since: string) {
        // Fetch merged PRs since date
        const prsRes = await fetch(
            `https://api.github.com/repos/${repoFullName}/pulls?state=closed&per_page=20&sort=updated`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const prs = await prsRes.json() as Array<{
            number: number;
            title: string;
            body: string;
            merged_at: string | null;
            html_url: string;
            user: { login: string };
        }>;

        for (const pr of prs) {
            // Only process merged PRs after our since date
            if (!pr.merged_at || new Date(pr.merged_at) < new Date(since)) continue;

            const rawText = `PR #${pr.number}: ${pr.title}\n\nDescription:\n${pr.body || 'No description'}`;
            await this.sieveAndSave(orgId, rawText, pr.html_url, pr.merged_at);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Webhook: Process individual GitHub events in real-time
    // ─────────────────────────────────────────────────────────────

    async processWebhookEvent(orgId: string, event: string, payload: any) {
        let rawText: string | null = null;
        let sourceUrl: string | null = null;
        let createdAt: string = new Date().toISOString();

        if (event === 'pull_request' && payload.action === 'closed' && payload.pull_request?.merged) {
            const pr = payload.pull_request;
            rawText = `PR #${pr.number}: ${pr.title}\n\nDescription:\n${pr.body || 'No description'}`;
            sourceUrl = pr.html_url;
            createdAt = pr.merged_at;
        } else if (event === 'issues' && payload.action === 'closed') {
            const issue = payload.issue;
            rawText = `Issue #${issue.number}: ${issue.title}\n\nDescription:\n${issue.body || 'No description'}`;
            sourceUrl = issue.html_url;
            createdAt = issue.closed_at;
        }

        if (!rawText) {
            this.logger.debug(`GitHub webhook: ignored event=${event} action=${payload.action}`);
            return;
        }

        await this.sieveAndSave(orgId, rawText, sourceUrl, createdAt);
    }

    // ─────────────────────────────────────────────────────────────
    // Core: Run through AI Sieve → embed → save decision
    // ─────────────────────────────────────────────────────────────

    private async sieveAndSave(orgId: string, rawText: string, sourceUrl: string | null, createdAt: string) {
        // 1. Run through AI Sieve
        const sieved = await this.aiSieve.extract(rawText, 'GitHub');
        if (!sieved) return; // Not a decision — discard

        // 2. Generate vector embedding of the summary
        const embeddingRes = await this.ai_google.models.embedContent({
            model: 'gemini-embedding-001',
            contents: sieved.summary,
        });
        const embedding = embeddingRes.embeddings?.[0]?.values;
        if (!embedding) {
            this.logger.warn('Embedding generation failed — saving decision without vector');
        }

        // 3. Save to decisions table (admin client — system write)
        const adminClient = this.supabaseService.getAdminClient();
        const { data: decision, error } = await adminClient
            .from('decisions')
            .insert({
                org_id: orgId,
                title: sieved.title,
                summary: sieved.summary,
                status: 'pending',
                source_platform: 'github',
                source_url: sourceUrl,
                embedding: embedding ?? null,
                created_at: createdAt,
            })
            .select('id')
            .single();

        if (error) {
            this.logger.error('Failed to save decision', error);
            return;
        }

        // 4. Save extracted commitments
        if (sieved.commitments?.length && decision?.id) {
            const commitmentRows = sieved.commitments.map(c => ({
                decision_id: decision.id,
                org_id: orgId,
                description: c.description,
                owner_name: c.owner_name,
                status: 'open',
            }));
            await adminClient.from('commitments').insert(commitmentRows);
        }

        this.logger.log(`Saved GitHub decision: "${sieved.title}" for org=${orgId}`);
    }

    // ─────────────────────────────────────────────────────────────
    // Action Items: Live fetch from GitHub API
    // ─────────────────────────────────────────────────────────────

    async getActionItems(orgId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        // 1. Fetch the encrypted token + username + permissions from integrations
        const { data: integration, error } = await adminClient
            .from('integrations')
            .select('access_token, external_username, repos_permissions')
            .eq('org_id', orgId)
            .eq('platform', 'github')
            .single();

        if (error || !integration) {
            this.logger.warn(`No GitHub integration found for org=${orgId}`);
            return [];
        }

        const accessToken = this.decrypt(integration.access_token);
        const username = integration.external_username;
        const reposPermissions = (integration.repos_permissions as Array<{ full_name: string; permissions: any }>) || [];

        // Helper to determine role from permissions object
        const getRole = (repoFullName: string): 'admin' | 'maintainer' | 'writer' | 'reader' | 'unknown' => {
            const repo = reposPermissions.find(r => r.full_name === repoFullName);
            if (!repo?.permissions) return 'unknown';
            if (repo.permissions.admin) return 'admin';
            if (repo.permissions.maintain) return 'maintainer';
            if (repo.permissions.push) return 'writer';
            if (repo.permissions.pull) return 'reader';
            return 'unknown';
        };

        const headers = {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        };

        // 2. Call 5 GitHub API endpoints in parallel
        const [reviewRequests, assignedIssues, notifications, changesRequested, readyToMerge] = await Promise.all([
            // PRs where your review is requested
            fetch(`https://api.github.com/search/issues?q=type:pr+review-requested:${username}+state:open&per_page=10`, { headers })
                .then(r => r.json())
                .catch(() => ({ items: [] })),

            // Issues assigned to you
            fetch(`https://api.github.com/search/issues?q=assignee:${username}+is:issue+state:open&per_page=10`, { headers })
                .then(r => r.json())
                .catch(() => ({ items: [] })),

            // Notifications where you're participating (mentions)
            fetch(`https://api.github.com/notifications?participating=true&per_page=10`, { headers })
                .then(r => r.json())
                .catch(() => []),

            // PRs authored by you where changes were requested
            fetch(`https://api.github.com/search/issues?q=type:pr+author:${username}+state:open+review:changes_requested&per_page=10`, { headers })
                .then(r => r.json())
                .catch(() => ({ items: [] })),

            // PRs authored by you that are approved and ready to merge
            fetch(`https://api.github.com/search/issues?q=type:pr+author:${username}+state:open+review:approved&per_page=10`, { headers })
                .then(r => r.json())
                .catch(() => ({ items: [] })),
        ]);

        // 3. Normalize into unified ActionItem shape
        const items: Array<{
            id: string;
            type: 'review_request' | 'assigned_issue' | 'mention' | 'changes_requested' | 'ready_to_merge';
            title: string;
            repo: string;
            url: string;
            author: string;
            created_at: string;
            urgency: 'high' | 'medium' | 'low';
            user_role: 'admin' | 'maintainer' | 'writer' | 'reader' | 'unknown';
        }> = [];

        // Review requests (high urgency)
        for (const pr of (reviewRequests.items ?? [])) {
            const repoFullName = pr.repository_url?.split('/repos/')[1] ?? '';
            items.push({
                id: `review-${pr.id}`,
                type: 'review_request',
                title: pr.title,
                repo: repoFullName,
                url: pr.html_url,
                author: pr.user?.login ?? 'unknown',
                created_at: pr.created_at,
                urgency: 'high',
                user_role: getRole(repoFullName),
            });
        }

        // Assigned issues (medium urgency)
        for (const issue of (assignedIssues.items ?? [])) {
            const repoFullName = issue.repository_url?.split('/repos/')[1] ?? '';
            items.push({
                id: `assigned-${issue.id}`,
                type: 'assigned_issue',
                title: issue.title,
                repo: repoFullName,
                url: issue.html_url,
                author: issue.user?.login ?? 'unknown',
                created_at: issue.created_at,
                urgency: 'medium',
                user_role: getRole(repoFullName),
            });
        }

        // Mentions from notifications (low urgency)
        for (const notif of (Array.isArray(notifications) ? notifications : [])) {
            if (notif.reason === 'mention' || notif.reason === 'review_requested') {
                const repoFullName = notif.repository?.full_name ?? '';
                items.push({
                    id: `mention-${notif.id}`,
                    type: 'mention',
                    title: notif.subject?.title ?? 'Notification',
                    repo: repoFullName,
                    url: notif.subject?.url
                        ? notif.subject.url.replace('api.github.com/repos', 'github.com')
                            .replace('/pulls/', '/pull/')
                        : `https://github.com/${repoFullName}`,
                    author: '',
                    created_at: notif.updated_at,
                    urgency: 'low',
                    user_role: getRole(repoFullName),
                });
            }
        }

        // PRs needing your changes (high urgency)
        for (const pr of (changesRequested.items ?? [])) {
            const repoFullName = pr.repository_url?.split('/repos/')[1] ?? '';
            items.push({
                id: `changes-${pr.id}`,
                type: 'changes_requested',
                title: pr.title,
                repo: repoFullName,
                url: pr.html_url,
                author: pr.user?.login ?? 'unknown',
                created_at: pr.created_at,
                urgency: 'high',
                user_role: getRole(repoFullName),
            });
        }

        // PRs ready to merge (medium urgency)
        for (const pr of (readyToMerge.items ?? [])) {
            const repoFullName = pr.repository_url?.split('/repos/')[1] ?? '';
            items.push({
                id: `ready-${pr.id}`,
                type: 'ready_to_merge',
                title: pr.title,
                repo: repoFullName,
                url: pr.html_url,
                author: pr.user?.login ?? 'unknown',
                created_at: pr.created_at,
                urgency: 'medium',
                user_role: getRole(repoFullName),
            });
        }

        // 4. Sort: high → medium → low, then by date
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        items.sort((a, b) => {
            const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            if (diff !== 0) return diff;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        // 5. Deduplicate by title+repo
        const seen = new Set<string>();
        const unique = items.filter(item => {
            const key = `${item.title}::${item.repo}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return unique.slice(0, 20);
    }

    // ─────────────────────────────────────────────────────────────
    // Get integration status for the org
    // ─────────────────────────────────────────────────────────────

    async getIntegrationStatus(orgId: string) {
        const adminClient = this.supabaseService.getAdminClient();
        const { data } = await adminClient
            .from('integrations')
            .select('platform, external_username, sync_status, last_synced_at, data_range_days, repos_permissions')
            .eq('org_id', orgId);

        return data ?? [];
    }

    // ─────────────────────────────────────────────────────────────
    // Token encryption/decryption (AES-256-GCM)
    // ─────────────────────────────────────────────────────────────

    encrypt(text: string): string {
        const key = Buffer.from(this.configService.get<string>('ENCRYPTION_KEY') ?? '', 'hex');
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    decrypt(ciphertext: string): string {
        const [ivHex, tagHex, dataHex] = ciphertext.split(':');
        const key = Buffer.from(this.configService.get<string>('ENCRYPTION_KEY') ?? '', 'hex');
        const decipher = crypto.createDecipheriv(this.ALGORITHM, key, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
    }
}
