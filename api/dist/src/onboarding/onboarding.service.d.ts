import { SupabaseService } from '../supabase/supabase.service';
export declare class OnboardingService {
    private supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseService);
    getStatus(userId: string): Promise<{
        onboarding_completed: any;
        github_connected: any;
        gmail_connected: any;
        calendar_connected: any;
    }>;
    complete(userId: string): Promise<{
        success: boolean;
    }>;
}
