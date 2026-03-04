import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { SupabaseService } from '../supabase/supabase.service';


@Injectable()
export class IntelligenceService implements OnModuleInit {
    private readonly logger = new Logger(IntelligenceService.name);
    private groq: Groq;
    private ai_google: GoogleGenAI;
    private boss: any;

    constructor(
        private configService: ConfigService,
        private supabaseService: SupabaseService,
    ) {
        this.groq = new Groq({ apiKey: this.configService.get<string>('GROQ_API_KEY') });
        this.ai_google = new GoogleGenAI({ apiKey: this.configService.get<string>('GEMINI_API_KEY') });
    }

    async onModuleInit() {
        const dbUrl = this.configService.get<string>('DATABASE_URL');
        const { PgBoss } = require('pg-boss');
        this.boss = new PgBoss({
            connectionString: dbUrl,
            idleTimeoutMillis: 10000
        });
        await this.boss.start();

        // Start working on the ingestion queue
        await this.boss.createQueue('slack-ingestion');
        await this.boss.work('slack-ingestion', async (job: any) => {
            await this.processIngestionJob(job);
        });
        this.logger.log('Started listening to slack-ingestion queue');
    }

    private async processIngestionJob(job: any) {
        const { orgId, platform, rawPayload } = job.data as any;
        this.logger.log(`Processing job ${job.id} for org ${orgId} from ${platform}`);

        try {
            // 1. Extract JSON structured output via Groq (Llama 3 8B)
            const decisionObject = await this.extractDecisionWithGroq(rawPayload);

            if (!decisionObject) {
                this.logger.warn(`No decision extracted for job ${job.id}. Ignoring.`);
                return; // Job is considered successful (not failed), just nothing to do.
            }

            // 2. Generate Embedding via Gemini Free Tier
            const embeddingText = `${decisionObject.title}. ${decisionObject.summary}`;
            const embedding = await this.generateEmbedding(embeddingText);

            // 3. Save to Supabase
            await this.saveExtractedDecision(orgId, decisionObject, embedding, rawPayload);

            this.logger.log(`Successfully processed job ${job.id}`);

        } catch (error) {
            this.logger.error(`Failed to process job ${job.id}:`, error);
            throw error; // Let pg-boss retry it
        }
    }

    private async extractDecisionWithGroq(payload: any): Promise<any> {
        // A robust prompt designed for Groq
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
        } catch (e) {
            this.logger.error('Groq returned invalid JSON', output);
            return null;
        }
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        const response = await this.ai_google.models.embedContent({
            model: 'gemini-embedding-001',
            contents: text
        });
        if (!response.embeddings || response.embeddings.length === 0) {
            throw new Error('No embeddings returned from Google Gen AI.');
        }

        return response.embeddings[0].values as number[];
    }

    private async saveExtractedDecision(orgId: string, decision: any, embedding: number[], rawPayload: any) {
        // We use the Service Role key here because background workers don't have a user JWT.
        // They act as the system admin mapping to the correct orgId.
        const supabase = this.supabaseService.getAdminClient();

        // 1. Insert Decision
        const { data: decisionRow, error: decisionError } = await supabase
            .from('decisions')
            .insert({
                org_id: orgId,
                title: decision.title,
                summary: decision.summary,
                status: decision.status,
                source_platform: 'slack',
                embedding: embedding // pgvector native insert
            })
            .select('id')
            .single();

        if (decisionError) throw decisionError;

        // 2. Insert Commitments
        if (decision.commitments && decision.commitments.length > 0) {
            const commitmentInserts = decision.commitments.map((c: any) => ({
                decision_id: decisionRow.id,
                org_id: orgId,
                owner_name: c.owner_name,
                description: c.description,
                status: 'open'
            }));

            const { error: commitError } = await supabase
                .from('commitments')
                .insert(commitmentInserts);

            if (commitError) throw commitError;
        }

        // Note: In MVP, we skip deleting ingestion_events right away to allow manual debugging,
        // but in production, you would DELETE the raw payload here to preserve privacy.
    }
}
