import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private readonly logger = new Logger(SupabaseService.name);
    private adminClientInstance: SupabaseClient;

    constructor(private readonly configService: ConfigService) { }

    /**
     * Returns a Supabase client with the Service Role key.
     * WARNING: This bypasses Row Level Security (RLS).
     * Use for background workers and system-level operations only.
     */
    getAdminClient(): SupabaseClient {
        if (this.adminClientInstance) {
            return this.adminClientInstance;
        }

        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            this.logger.error('Supabase URL or Key is missing from environment variables');
            throw new Error('Supabase initialization failed');
        }

        this.adminClientInstance = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        return this.adminClientInstance;
    }

    /**
     * Returns a Supabase client initialized with a specific user's JWT.
     * This ensures Row Level Security (RLS) is applied automatically for the db queries.
     */
    getClientWithAuth(jwtToken: string): SupabaseClient {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

        if (!supabaseUrl || !supabaseAnonKey) {
            this.logger.error('Supabase URL or Anon Key missing from environment');
            throw new Error('Supabase initialization failed');
        }

        return createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
            global: {
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                },
            },
        });
    }

    /**
     * Verifies a JWT token by asking Supabase to decode/validate it.
     * This avoids needing the SUPABASE_JWT_SECRET in the backend environment
     * and handles key rotation/asymmetric keys automatically.
     */
    async getUserFromToken(jwtToken: string) {
        // Use the admin client to verify the user token
        const { data: { user }, error } = await this.getAdminClient().auth.getUser(jwtToken);
        if (error || !user) {
            this.logger.error('Token verification failed', error);
            return null;
        }
        return user;
    }
}
