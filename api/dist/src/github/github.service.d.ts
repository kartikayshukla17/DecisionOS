import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { AiSieveService } from '../common/ai-sieve.service';
export declare class GithubService {
    private supabaseService;
    private configService;
    private aiSieve;
    private readonly logger;
    private readonly ai_google;
    private readonly ALGORITHM;
    constructor(supabaseService: SupabaseService, configService: ConfigService, aiSieve: AiSieveService);
    connectGithub(org_id: string, owner_id: string, code: string, dataRangeDays: number, redirectUri?: string): Promise<{
        username: string;
    }>;
    private queueBackfill;
    processBackfill(orgId: string, username: string, accessToken: string, since: string): Promise<void>;
    private processRepoDecisions;
    processWebhookEvent(orgId: string, event: string, payload: any): Promise<void>;
    private sieveAndSave;
    getActionItems(orgId: string): Promise<{
        id: string;
        type: "review_request" | "assigned_issue" | "mention" | "changes_requested" | "ready_to_merge";
        title: string;
        repo: string;
        url: string;
        author: string;
        created_at: string;
        urgency: "high" | "medium" | "low";
        user_role: "admin" | "maintainer" | "writer" | "reader" | "unknown";
    }[]>;
    getIntegrationStatus(orgId: string): Promise<{
        platform: any;
        external_username: any;
        sync_status: any;
        last_synced_at: any;
        data_range_days: any;
        repos_permissions: any;
    }[]>;
    encrypt(text: string): string;
    decrypt(ciphertext: string): string;
}
