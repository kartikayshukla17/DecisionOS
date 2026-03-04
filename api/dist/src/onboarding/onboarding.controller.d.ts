import { OnboardingService } from './onboarding.service';
export declare class OnboardingController {
    private readonly onboardingService;
    constructor(onboardingService: OnboardingService);
    getStatus(req: any): Promise<{
        onboarding_completed: any;
        github_connected: any;
        gmail_connected: any;
        calendar_connected: any;
    }>;
    complete(req: any): Promise<{
        success: boolean;
    }>;
}
