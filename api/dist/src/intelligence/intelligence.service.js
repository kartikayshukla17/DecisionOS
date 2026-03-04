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
var IntelligenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelligenceService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const genai_1 = require("@google/genai");
const supabase_service_1 = require("../supabase/supabase.service");
let IntelligenceService = IntelligenceService_1 = class IntelligenceService {
    configService;
    supabaseService;
    logger = new common_1.Logger(IntelligenceService_1.name);
    groq;
    ai_google;
    boss;
    constructor(configService, supabaseService) {
        this.configService = configService;
        this.supabaseService = supabaseService;
        this.groq = new groq_sdk_1.default({ apiKey: this.configService.get('GROQ_API_KEY') });
        this.ai_google = new genai_1.GoogleGenAI({ apiKey: this.configService.get('GEMINI_API_KEY') });
    }
    async onModuleInit() {
        const dbUrl = this.configService.get('DATABASE_URL');
        const { PgBoss } = require('pg-boss');
        this.boss = new PgBoss({
            connectionString: dbUrl,
            idleTimeoutMillis: 10000
        });
        await this.boss.start();
        await this.boss.createQueue('slack-ingestion');
        await this.boss.work('slack-ingestion', async (job) => {
            await this.processIngestionJob(job);
        });
        this.logger.log('Started listening to slack-ingestion queue');
    }
    async processIngestionJob(job) {
        const { orgId, platform, rawPayload } = job.data;
        this.logger.log(`Processing job ${job.id} for org ${orgId} from ${platform}`);
        try {
            const decisionObject = await this.extractDecisionWithGroq(rawPayload);
            if (!decisionObject) {
                this.logger.warn(`No decision extracted for job ${job.id}. Ignoring.`);
                return;
            }
            const embeddingText = `${decisionObject.title}. ${decisionObject.summary}`;
            const embedding = await this.generateEmbedding(embeddingText);
            await this.saveExtractedDecision(orgId, decisionObject, embedding, rawPayload);
            this.logger.log(`Successfully processed job ${job.id}`);
        }
        catch (error) {
            this.logger.error(`Failed to process job ${job.id}:`, error);
            throw error;
        }
    }
    async extractDecisionWithGroq(payload) {
        const prompt = `
      You are an expert executive assistant. Analyze the following Slack thread payload.
      If it contains a clear decision, meeting output, or commitment, extract it into a JSON object strictly matching this schema:
      {
        "title": "Short descriptive title",
        "summary": "1-3 sentences summarizing what was decided",
        "status": "pending" | "approved" | "resolved",
        "commitments": [
           { "owner_name": "Name of person responsible", "description": "What they must do" }
        ]
      }
      If there is NO clear decision, return exactly the string "NO_DECISION". 
      Only return valid JSON or "NO_DECISION". No backticks, no conversational text.
      
      Payload:
      ${JSON.stringify(payload)}
    `;
        const chatCompletion = await this.groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama3-8b-8192',
            temperature: 0.1,
        });
        const output = chatCompletion.choices[0]?.message?.content?.trim();
        if (!output || output === 'NO_DECISION') {
            return null;
        }
        try {
            return JSON.parse(output);
        }
        catch (e) {
            this.logger.error('Groq returned invalid JSON', output);
            return null;
        }
    }
    async generateEmbedding(text) {
        const response = await this.ai_google.models.embedContent({
            model: 'gemini-embedding-001',
            contents: text
        });
        if (!response.embeddings || response.embeddings.length === 0) {
            throw new Error('No embeddings returned from Google Gen AI.');
        }
        return response.embeddings[0].values;
    }
    async saveExtractedDecision(orgId, decision, embedding, rawPayload) {
        const supabase = this.supabaseService.getAdminClient();
        const { data: decisionRow, error: decisionError } = await supabase
            .from('decisions')
            .insert({
            org_id: orgId,
            title: decision.title,
            summary: decision.summary,
            status: decision.status,
            source_platform: 'slack',
            embedding: embedding
        })
            .select('id')
            .single();
        if (decisionError)
            throw decisionError;
        if (decision.commitments && decision.commitments.length > 0) {
            const commitmentInserts = decision.commitments.map((c) => ({
                decision_id: decisionRow.id,
                org_id: orgId,
                owner_name: c.owner_name,
                description: c.description,
                status: 'open'
            }));
            const { error: commitError } = await supabase
                .from('commitments')
                .insert(commitmentInserts);
            if (commitError)
                throw commitError;
        }
    }
};
exports.IntelligenceService = IntelligenceService;
exports.IntelligenceService = IntelligenceService = IntelligenceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        supabase_service_1.SupabaseService])
], IntelligenceService);
//# sourceMappingURL=intelligence.service.js.map