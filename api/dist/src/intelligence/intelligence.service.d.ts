import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
export declare class IntelligenceService implements OnModuleInit {
    private configService;
    private supabaseService;
    private readonly logger;
    private groq;
    private ai_google;
    private boss;
    constructor(configService: ConfigService, supabaseService: SupabaseService);
    onModuleInit(): Promise<void>;
    private processIngestionJob;
    private extractDecisionWithGroq;
    private generateEmbedding;
    private saveExtractedDecision;
}
