import { Controller, Get, Post, Body, Req, UseGuards, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { DecisionsService } from '../decisions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';
import { z } from 'zod';

const DraftRequestSchema = z.object({
    question: z.string().min(5).max(1000)
});

const CreateDecisionSchema = z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(2000),
    status: z.enum(['pending', 'approved', 'critical']).optional(),
    source_url: z.string().url().optional(),
});

@Controller('decisions')
@UseGuards(JwtAuthGuard)
export class DecisionsController {
    constructor(private readonly decisionsService: DecisionsService) { }

    @Get('queue')
    async getQueue(@Req() req: any) {
        const authHeader = req.headers.authorization;
        if (!authHeader) throw new UnauthorizedException('No token');
        const token = authHeader.split(' ')[1];
        const { orgId } = req.user;
        return this.decisionsService.getQueue(token, orgId);
    }

    @Post('draft')
    async draftResponse(@Req() req: any, @Body() body: any) {
        // Validation Layer: Protect against massive context inputs
        const validationResult = DraftRequestSchema.safeParse(body);
        if (!validationResult.success) {
            throw new BadRequestException(validationResult.error.format());
        }

        const { question } = validationResult.data;

        const authHeader = req.headers.authorization;
        if (!authHeader) throw new UnauthorizedException('No token');
        const token = authHeader.split(' ')[1];
        const { orgId } = req.user;

        return this.decisionsService.draftResponse(token, orgId, question);
    }

    @Post()
    async createDecision(@Req() req: any, @Body() body: any) {
        const parsed = CreateDecisionSchema.safeParse(body);
        if (!parsed.success) throw new BadRequestException(parsed.error.format());

        const authHeader = req.headers.authorization;
        if (!authHeader) throw new UnauthorizedException('No token');
        const token = authHeader.split(' ')[1];
        const { id, orgId } = req.user;

        return this.decisionsService.createManual(token, orgId, id, parsed.data);
    }
}
