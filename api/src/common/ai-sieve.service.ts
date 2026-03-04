import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface SievedDecision {
    title: string;
    summary: string;
    commitments: Array<{ description: string; owner_name: string }>;
}

@Injectable()
export class AiSieveService {
    private readonly logger = new Logger(AiSieveService.name);
    private groq: Groq;

    constructor(private configService: ConfigService) {
        this.groq = new Groq({
            apiKey: this.configService.get<string>('GROQ_API_KEY'),
        });
    }

    /**
     * Analyzes raw text and determines if a concrete decision was made.
     * Returns null if no decision is found (pure noise), or a structured
     * SievedDecision object if a decision is extracted.
     *
     * Raw text is never stored persistently — this call is stateless.
     */
    async extract(rawText: string, platform: string): Promise<SievedDecision | null> {
        const prompt = `You are a decision extraction engine analyzing ${platform} content.

Analyze the following text and determine if a CONCRETE, ACTIONABLE DECISION was made (e.g. "We decided to use X", "PR #42 merged: switching to GraphQL", "Meeting resolved: Sarah will lead Q4 infra").

Rules:
- Discussions, brainstorming, or questions are NOT decisions.
- A merged PR with a clear architectural change IS a decision.
- A meeting note with "we decided to..." IS a decision.
- Vague updates or FYI messages are NOT decisions.

If NO decision was made, respond with exactly: NULL

If a decision WAS made, respond with ONLY valid JSON in this exact format:
{
  "title": "Brief decision title (max 100 chars)",
  "summary": "2-3 sentence factual summary of what was decided and why. No hallucination.",
  "commitments": [
    { "description": "Action item text", "owner_name": "Person's name or 'Unknown'" }
  ]
}

TEXT TO ANALYZE:
---
${rawText.substring(0, 4000)}
---`;

        try {
            const result = await this.groq.chat.completions.create({
                model: 'llama3-8b-8192',
                temperature: 0.1, // Very low — we want deterministic extraction, not creativity
                messages: [{ role: 'user', content: prompt }],
            });

            const content = result.choices[0]?.message?.content?.trim();
            if (!content || content === 'NULL') {
                this.logger.debug(`AI Sieve: No decision found in ${platform} content`);
                return null;
            }

            // Strip any markdown code fences if the LLM added them
            const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(jsonString) as SievedDecision;

            this.logger.log(`AI Sieve: Decision extracted — "${parsed.title}"`);
            return parsed;
        } catch (err) {
            this.logger.error(`AI Sieve extraction failed for ${platform} content`, err);
            return null; // Fail open: discard the event, never crash the worker
        }
    }
}
