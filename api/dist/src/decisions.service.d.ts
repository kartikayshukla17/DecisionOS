import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase/supabase.service';
export interface CreateManualDecisionDto {
    title: string;
    description: string;
    status?: 'pending' | 'approved' | 'critical';
    source_url?: string;
}
export declare class DecisionsService {
    private supabaseService;
    private configService;
    private readonly logger;
    private groq;
    private ai_google;
    constructor(supabaseService: SupabaseService, configService: ConfigService);
    getQueue(jwt: string, orgId: string): Promise<{
        id: any;
        title: any;
        summary: any;
        status: any;
        source_platform: any;
        created_at: any;
        commitments: {
            id: any;
            description: any;
            owner_name: any;
            status: any;
        }[];
    }[]>;
    draftResponse(jwt: string, orgId: string, question: string): Promise<{
        draft: string | undefined;
        sources: any;
    }>;
    createManual(jwt: string, orgId: string, userId: string, dto: CreateManualDecisionDto): Promise<{
        id: any;
        title: any;
        status: any;
        created_at: any;
    }>;
}
