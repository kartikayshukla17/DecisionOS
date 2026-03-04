import { Controller, Post, Body, Headers, HttpCode, HttpStatus, UnauthorizedException, Param, Req } from '@nestjs/common';
import { IngestionService } from '../ingestion.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('webhooks')
export class IngestionController {
    constructor(
        private readonly ingestionService: IngestionService,
        private readonly configService: ConfigService,
    ) { }

    // We include orgId in the URL path for simplicity in the MVP.
    // In production, you might map a specific Slack workspace ID from the payload to an orgId.
    @Post('slack/:orgId')
    @HttpCode(HttpStatus.OK)
    async handleSlackWebhook(
        @Param('orgId') orgId: string,
        @Body() payload: any,
        @Headers('x-slack-signature') signature: string,
        @Headers('x-slack-request-timestamp') timestamp: string,
        @Req() req: any,
    ) {
        // 1. Initial Challenge Response (Slack Requires This)
        if (payload.type === 'url_verification') {
            return { challenge: payload.challenge };
        }

        // 2. Real Slack Signature Validation
        // req.rawBody is populated by the raw body parser middleware (e.g., in main.ts)
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        if (!this.isValidSlackSignature(signature, timestamp, rawBody)) {
            throw new UnauthorizedException('Invalid Slack signature');
        }

        // 3. Ignore bot messages to prevent infinite loops
        if (payload.event?.bot_id || payload.event?.subtype === 'bot_message') {
            return { status: 'ignored (bot)' };
        }

        // 4. Quick Acknowledge and Queue
        // We return 200 OK immediately and let pg-boss handle it async.
        await this.queueEventSafely(payload, orgId);

        return { status: 'queued' };
    }

    private isValidSlackSignature(signature: string, timestamp: string, rawBody: string): boolean {
        // Allow missing signatures in local dev if no secret is set
        const secret = this.configService.get<string>('SLACK_WEBHOOK_SECRET');
        if (!secret) return true;

        if (!signature || !timestamp) return false;

        // Verify request is not older than 5 minutes to prevent replay attacks
        const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5);
        if (parseInt(timestamp, 10) < fiveMinutesAgo) return false;

        const sigBasestring = `v0:${timestamp}:${rawBody}`;
        const mySignature = 'v0=' + crypto.createHmac('sha256', secret).update(sigBasestring).digest('hex');

        try {
            return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
        } catch (e) {
            return false;
        }
    }

    private async queueEventSafely(payload: any, orgId: string) {
        try {
            await this.ingestionService.queueSlackEvent(payload, orgId);
        } catch (e) {
            // Log errors but do not crash the webhook response.
            console.error('Failed to queue webhook event:', e);
        }
    }
}
