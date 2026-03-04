import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(private supabaseService: SupabaseService) { }

    /**
     * Returns the current onboarding + integration state for the logged-in user.
     * This is the first call the frontend makes after login to decide whether to
     * redirect to /onboarding or /dashboard.
     */
    async getStatus(userId: string) {
        const adminClient = this.supabaseService.getAdminClient();
        const { data: user, error } = await adminClient
            .from('users')
            .select('onboarding_completed, github_connected, gmail_connected, calendar_connected')
            .eq('id', userId)
            .single();

        if (error || !user) {
            this.logger.warn(`No user row found for id=${userId}`);
            return {
                onboarding_completed: false,
                github_connected: false,
                gmail_connected: false,
                calendar_connected: false,
            };
        }

        return user;
    }

    /**
     * Marks onboarding as complete for this user.
     * Called when the user clicks "Go to Dashboard" at the end of the wizard.
     */
    async complete(userId: string) {
        const adminClient = this.supabaseService.getAdminClient();
        const { error } = await adminClient
            .from('users')
            .update({ onboarding_completed: true })
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    }
}
