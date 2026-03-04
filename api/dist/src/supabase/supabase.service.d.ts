import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private readonly configService;
    private readonly logger;
    private adminClientInstance;
    constructor(configService: ConfigService);
    getAdminClient(): SupabaseClient;
    getClientWithAuth(jwtToken: string): SupabaseClient;
    getUserFromToken(jwtToken: string): Promise<import("@supabase/supabase-js").AuthUser | null>;
}
