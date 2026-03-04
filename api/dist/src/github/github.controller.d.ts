import { GithubService } from './github.service';
import { ConfigService } from '@nestjs/config';
export declare class GithubController {
    private readonly githubService;
    private readonly configService;
    constructor(githubService: GithubService, configService: ConfigService);
    connect(req: any, body: any): Promise<{
        username: string;
    }>;
    status(req: any): Promise<{
        platform: any;
        external_username: any;
        sync_status: any;
        last_synced_at: any;
        data_range_days: any;
        repos_permissions: any;
    }[]>;
    actionItems(req: any): Promise<{
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
    handleWebhook(orgId: string, payload: any, event: string, signature: string, req: any): Promise<{
        status: string;
    }>;
    private isValidSignature;
}
