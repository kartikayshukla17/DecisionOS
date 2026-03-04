"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AiSieveService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSieveService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
let AiSieveService = AiSieveService_1 = class AiSieveService {
    configService;
    logger = new common_1.Logger(AiSieveService_1.name);
    groq;
    constructor(configService) {
        this.configService = configService;
        this.groq = new groq_sdk_1.default({
            apiKey: this.configService.get('GROQ_API_KEY'),
        });
    }
    async extract(rawText, platform) {
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
                temperature: 0.1,
                messages: [{ role: 'user', content: prompt }],
            });
            const content = result.choices[0]?.message?.content?.trim();
            if (!content || content === 'NULL') {
                this.logger.debug(`AI Sieve: No decision found in ${platform} content`);
                return null;
            }
            const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(jsonString);
            this.logger.log(`AI Sieve: Decision extracted — "${parsed.title}"`);
            return parsed;
        }
        catch (err) {
            this.logger.error(`AI Sieve extraction failed for ${platform} content`, err);
            return null;
        }
    }
};
exports.AiSieveService = AiSieveService;
exports.AiSieveService = AiSieveService = AiSieveService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiSieveService);
//# sourceMappingURL=ai-sieve.service.js.map