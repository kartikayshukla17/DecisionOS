import { Controller, Get, Post, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) { }

    /**
     * GET /onboarding/status
     * Returns the user's onboarding and integration state.
     * The frontend calls this immediately after login.
     */
    @Get('status')
    async getStatus(@Req() req: any) {
        return this.onboardingService.getStatus(req.user.id);
    }

    /**
     * POST /onboarding/complete
     * Called when the user finishes the onboarding wizard.
     */
    @Post('complete')
    async complete(@Req() req: any) {
        return this.onboardingService.complete(req.user.id);
    }
}
