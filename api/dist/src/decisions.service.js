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
var DecisionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_service_1 = require("./supabase/supabase.service");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const genai_1 = require("@google/genai");
let DecisionsService = DecisionsService_1 = class DecisionsService {
    supabaseService;
    configService;
    logger = new common_1.Logger(DecisionsService_1.name);
    groq;
    ai_google;
    constructor(supabaseService, configService) {
        this.supabaseService = supabaseService;
        this.configService = configService;
        this.groq = new groq_sdk_1.default({ apiKey: this.configService.get('GROQ_API_KEY') });
        this.ai_google = new genai_1.GoogleGenAI({ apiKey: this.configService.get('GEMINI_API_KEY') });
    }
    async getQueue(jwt, orgId) {
        const supabase = this.supabaseService.getClientWithAuth(jwt);
        const { data, error } = await supabase
            .from('decisions')
            .select('id, title, summary, status, source_platform, created_at, commitments(id, description, owner_name, status)')
            .eq('org_id', orgId)
            .in('status', ['pending', 'approved'])
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) {
            this.logger.error('Error fetching decision queue', error);
            throw error;
        }
        return data;
    }
    async draftResponse(jwt, orgId, question) {
        const supabase = this.supabaseService.getClientWithAuth(jwt);
        const embeddingResponse = await this.ai_google.models.embedContent({
            model: 'gemini-embedding-001',
            contents: question
        });
        if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
            throw new Error('No embeddings returned from Google Gen AI.');
        }
        const queryEmbedding = embeddingResponse.embeddings[0].values;
        const { data: matchedDecisions, error } = await supabase.rpc('match_decisions', {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: 3,
            p_org_id: orgId
        });
        if (error) {
            this.logger.error('RPC Error fetching matches', error);
            throw error;
        }
        let contextString = 'Past Decisions Context:\n';
        if (matchedDecisions && matchedDecisions.length > 0) {
            matchedDecisions.forEach((m) => {
                contextString += `- ${m.title}: ${m.summary} (Status: ${m.status})\n`;
            });
        }
        else {
            contextString += 'No relevant past decisions found.\n';
        }
        const prompt = `
      You are an executive assistant integrated into DecisionOS.
      You are drafting a response based ONLY on the following past decisions matching the user's query context.
      
      ${contextString}
 
      User Question/Request: ${question}

      Write a professional, context-aware draft. Do not hallucinate outside facts.
    `;
        const chatCompletion = await this.groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama3-8b-8192',
            temperature: 0.3,
        });
        return {
            draft: chatCompletion.choices[0]?.message?.content?.trim(),
            sources: matchedDecisions
        };
    }
    async createManual(jwt, orgId, userId, dto) {
        const supabase = this.supabaseService.getAdminClient();
        if (!orgId)
            throw new Error('User has no org_id');
        let embedding = null;
        try {
            const embeddingRes = await this.ai_google.models.embedContent({
                model: 'gemini-embedding-001',
                contents: `${dto.title}. ${dto.description}`,
            });
            embedding = embeddingRes.embeddings?.[0]?.values ?? null;
        }
        catch (err) {
            this.logger.warn('Embedding failed for manual decision — saving without vector', err);
        }
        const { data, error } = await supabase
            .from('decisions')
            .insert({
            org_id: orgId,
            creator_id: userId,
            title: dto.title,
            summary: dto.description,
            status: dto.status ?? 'pending',
            source_platform: 'manual',
            source_url: dto.source_url ?? null,
            embedding,
        })
            .select('id, title, status, created_at')
            .single();
        if (error)
            throw error;
        return data;
    }
};
exports.DecisionsService = DecisionsService;
exports.DecisionsService = DecisionsService = DecisionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        config_1.ConfigService])
], DecisionsService);
//# sourceMappingURL=decisions.service.js.map