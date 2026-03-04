import {
    Controller, Post, Get, Body, Req, Headers, Param,
    UseGuards, UnauthorizedException, BadRequestException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { GithubService } from './github.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import * as crypto from 'crypto';
import type { Request } from 'express';

const ConnectSchema = z.object({
    code: z.string().min(1),
    redirectUri: z.string().optional(),
    dataRangeDays: z.union([z.literal(7), z.literal(30), z.literal(0)]).default(30),
});

@Controller()
export class GithubController {
    constructor(
        private readonly githubService: GithubService,
        private readonly configService: ConfigService,
    ) { }

    // ─── OAuth: Authenticated user calls this with the code from GitHub ───

    @Post('integrations/github/connect')
    @UseGuards(JwtAuthGuard)
    async connect(@Req() req: any, @Body() body: any) {
        console.log('[GithubController] Received connect request:', body);
        const parsed = ConnectSchema.safeParse(body);
        if (!parsed.success) {
            console.error('[GithubController] Body validation failed:', parsed.error.format());
            throw new BadRequestException(parsed.error.format());
        }

        const { id, orgId } = req.user;
        return this.githubService.connectGithub(
            orgId,
            id,
            parsed.data.code,
            parsed.data.dataRangeDays,
            parsed.data.redirectUri
        );
    }

    // ─── Get integration status for the authenticated user's org ───

    @Get('integrations/github/status')
    @UseGuards(JwtAuthGuard)
    async status(@Req() req: any) {
        const { orgId } = req.user;
        return this.githubService.getIntegrationStatus(orgId);
    }

    // ─── Live action items from GitHub ───

    @Get('github/action-items')
    @UseGuards(JwtAuthGuard)
    async actionItems(@Req() req: any) {
        const { orgId } = req.user;
        return this.githubService.getActionItems(orgId);
    }

    // ─── Webhook: GitHub calls this for real-time events ───

    @Post('webhooks/github/:orgId')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Param('orgId') orgId: string,
        @Body() payload: any,
        @Headers('x-github-event') event: string,
        @Headers('x-hub-signature-256') signature: string,
        @Req() req: any,
    ) {
        // Validate HMAC signature
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        if (!this.isValidSignature(signature, rawBody)) {
            throw new UnauthorizedException('Invalid GitHub webhook signature');
        }

        // Acknowledge immediately, process async
        setImmediate(() => {
            this.githubService.processWebhookEvent(orgId, event, payload).catch(err =>
                console.error('GitHub webhook processing failed:', err),
            );
        });

        return { status: 'queued' };
    }

    private isValidSignature(signature: string, rawBody: string): boolean {
        const secret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET');
        if (!secret) return true; // Allow in local dev

        if (!signature) return false;
        const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
        } catch {
            return false;
        }
    }
}
