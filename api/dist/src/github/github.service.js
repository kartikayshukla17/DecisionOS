"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GithubService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_service_1 = require("../supabase/supabase.service");
const ai_sieve_service_1 = require("../common/ai-sieve.service");
const genai_1 = require("@google/genai");
const crypto = __importStar(require("crypto"));
let GithubService = GithubService_1 = class GithubService {
    supabaseService;
    configService;
    aiSieve;
    logger = new common_1.Logger(GithubService_1.name);
    ai_google;
    ALGORITHM = 'aes-256-gcm';
    constructor(supabaseService, configService, aiSieve) {
        this.supabaseService = supabaseService;
        this.configService = configService;
        this.aiSieve = aiSieve;
        this.ai_google = new genai_1.GoogleGenAI({
            apiKey: this.configService.get('GEMINI_API_KEY'),
        });
    }
    async connectGithub(org_id, owner_id, code, dataRangeDays, redirectUri) {
        this.logger.log(`[GithubService] Starting OAuth exchange. client_id=${this.configService.get('GITHUB_CLIENT_ID')} redirect_uri=${redirectUri}`);
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                client_id: this.configService.get('GITHUB_CLIENT_ID'),
                client_secret: this.configService.get('GITHUB_CLIENT_SECRET'),
                code,
                redirect_uri: redirectUri,
            }),
        });
        const tokenData = await tokenRes.json();
        this.logger.log(`[GithubService] Token response: ${JSON.stringify(tokenData)}`);
        if (!tokenData.access_token) {
            this.logger.error(`[GithubService] GitHub OAuth failed. Error: ${tokenData.error}, Description: ${tokenData.error_description}`);
            throw new Error(`GitHub OAuth failed: ${tokenData.error_description || 'no access token returned'}`);
        }
        const userRes = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const ghUser = await userRes.json();
        this.logger.log(`[GithubService] User response: ${JSON.stringify(ghUser)}`);
        if (ghUser.message) {
            this.logger.error(`[GithubService] Failed to fetch GitHub user: ${ghUser.message}`);
            throw new Error(`Failed to fetch GitHub user: ${ghUser.message}`);
        }
        this.logger.log(`[GithubService] OrgID: ${org_id}, OwnerID: ${owner_id}`);
        if (!org_id)
            throw new Error('User has no org_id — complete org setup first');
        const encryptedToken = this.encrypt(tokenData.access_token);
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
        await adminClient.from('users').update({ github_connected: true }).eq('id', owner_id);
        this.queueBackfill(org_id, ghUser.login, tokenData.access_token, dataRangeDays).catch(err => this.logger.error('Backfill queue failed (non-fatal)', err));
        return { username: ghUser.login };
    }
    async queueBackfill(orgId, username, accessToken, rangeDays) {
        if (rangeDays === 0) {
            this.logger.log(`org=${orgId} chose "start fresh" — skipping backfill`);
            return;
        }
        const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
        this.logger.log(`Queueing GitHub backfill for org=${orgId} since ${since}`);
        await this.processBackfill(orgId, username, accessToken, since);
    }
    async processBackfill(orgId, username, accessToken, since) {
        const adminClient = this.supabaseService.getAdminClient();
        await adminClient.from('integrations')
            .update({ sync_status: 'syncing' })
            .eq('org_id', orgId)
            .eq('platform', 'github');
        try {
            const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=pushed', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const repos = await reposRes.json();
            const reposPermissions = repos.map(repo => ({
                full_name: repo.full_name,
                permissions: repo.permissions
            }));
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
        }
        catch (err) {
            this.logger.error(`Backfill failed for org=${orgId}`, err);
            await adminClient.from('integrations')
                .update({ sync_status: 'error' })
                .eq('org_id', orgId)
                .eq('platform', 'github');
        }
    }
    async processRepoDecisions(orgId, repoFullName, accessToken, since) {
        const prsRes = await fetch(`https://api.github.com/repos/${repoFullName}/pulls?state=closed&per_page=20&sort=updated`, { headers: { Authorization: `Bearer ${accessToken}` } });
        const prs = await prsRes.json();
        for (const pr of prs) {
            if (!pr.merged_at || new Date(pr.merged_at) < new Date(since))
                continue;
            const rawText = `PR #${pr.number}: ${pr.title}\n\nDescription:\n${pr.body || 'No description'}`;
            await this.sieveAndSave(orgId, rawText, pr.html_url, pr.merged_at);
        }
    }
    async processWebhookEvent(orgId, event, payload) {
        let rawText = null;
        let sourceUrl = null;
        let createdAt = new Date().toISOString();
        if (event === 'pull_request' && payload.action === 'closed' && payload.pull_request?.merged) {
            const pr = payload.pull_request;
            rawText = `PR #${pr.number}: ${pr.title}\n\nDescription:\n${pr.body || 'No description'}`;
            sourceUrl = pr.html_url;
            createdAt = pr.merged_at;
        }
        else if (event === 'issues' && payload.action === 'closed') {
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
    async sieveAndSave(orgId, rawText, sourceUrl, createdAt) {
        const sieved = await this.aiSieve.extract(rawText, 'GitHub');
        if (!sieved)
            return;
        const embeddingRes = await this.ai_google.models.embedContent({
            model: 'gemini-embedding-001',
            contents: sieved.summary,
        });
        const embedding = embeddingRes.embeddings?.[0]?.values;
        if (!embedding) {
            this.logger.warn('Embedding generation failed — saving decision without vector');
        }
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
    async getActionItems(orgId) {
        const adminClient = this.supabaseService.getAdminClient();
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
        const reposPermissions = integration.repos_permissions || [];
        const getRole = (repoFullName) => {
            const repo = reposPermissions.find(r => r.full_name === repoFullName);
            if (!repo?.permissions)
                return 'unknown';
            if (repo.permissions.admin)
                return 'admin';
            if (repo.permissions.maintain)
                return 'maintainer';
            if (repo.permissions.push)
                return 'writer';
            if (repo.permissions.pull)
                return 'reader';
            return 'unknown';
        };
        const headers = {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        };
        const [reviewRequests, assignedIssues, notifications, changesRequested, readyToMerge] = await Promise.all([
            fetch(`https://api.github.com/search/issues?q=type:pr+review-requested:${username}+state:open&per_page=10`, { headers })
                .then(r => r.json())
                .catch(() => ({ items: [] })),
            fetch(`https://api.github.com/search/issues?q=assignee:${username}+is:issue+state:open&per_page=10`, { headers })
                .then(r => r.json())
                .catch(() => ({ items: [] })),
            fetch(`https://api.github.com/notifications?participating=true&per_page=10`, { headers })
                .then(r => r.json())
                .catch(() => []),
            fetch(`https://api.github.com/search/issues?q=type:pr+author:${username}+state:open+review:changes_requested&per_page=10`, { headers })
                .then(r => r.json())
                .catch(() => ({ items: [] })),
            fetch(`https://api.github.com/search/issues?q=type:pr+author:${username}+state:open+review:approved&per_page=10`, { headers })
                .then(r => r.json())
                .catch(() => ({ items: [] })),
        ]);
        const items = [];
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
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        items.sort((a, b) => {
            const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            if (diff !== 0)
                return diff;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        const seen = new Set();
        const unique = items.filter(item => {
            const key = `${item.title}::${item.repo}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
        return unique.slice(0, 20);
    }
    async getIntegrationStatus(orgId) {
        const adminClient = this.supabaseService.getAdminClient();
        const { data } = await adminClient
            .from('integrations')
            .select('platform, external_username, sync_status, last_synced_at, data_range_days, repos_permissions')
            .eq('org_id', orgId);
        return data ?? [];
    }
    encrypt(text) {
        const key = Buffer.from(this.configService.get('ENCRYPTION_KEY') ?? '', 'hex');
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
    }
    decrypt(ciphertext) {
        const [ivHex, tagHex, dataHex] = ciphertext.split(':');
        const key = Buffer.from(this.configService.get('ENCRYPTION_KEY') ?? '', 'hex');
        const decipher = crypto.createDecipheriv(this.ALGORITHM, key, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
    }
};
exports.GithubService = GithubService;
exports.GithubService = GithubService = GithubService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        config_1.ConfigService,
        ai_sieve_service_1.AiSieveService])
], GithubService);
//# sourceMappingURL=github.service.js.map