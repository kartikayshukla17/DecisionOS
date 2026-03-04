import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase/supabase.service';
import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';

export interface CreateManualDecisionDto {
    title: string;
    description: string;
    status?: 'pending' | 'approved' | 'critical';
    source_url?: string;
}

@Injectable()
export class DecisionsService {
    private readonly logger = new Logger(DecisionsService.name);
    private groq: Groq;
    private ai_google: GoogleGenAI;

    constructor(
        private supabaseService: SupabaseService,
        private configService: ConfigService
    ) {
        this.groq = new Groq({ apiKey: this.configService.get<string>('GROQ_API_KEY') });
        this.ai_google = new GoogleGenAI({ apiKey: this.configService.get<string>('GEMINI_API_KEY') });
    }

    async getQueue(jwt: string, orgId: string) {
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

    async draftResponse(jwt: string, orgId: string, question: string) {
        const supabase = this.supabaseService.getClientWithAuth(jwt);

        // 1. Generate text embedding for the user's question
        const embeddingResponse = await this.ai_google.models.embedContent({
            model: 'gemini-embedding-001',
            contents: question
        });
        if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
            throw new Error('No embeddings returned from Google Gen AI.');
        }

        const queryEmbedding = embeddingResponse.embeddings[0].values;

        // 2. Query Supabase RPC for vector match
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

        // 3. Draft response using Groq
        let contextString = 'Past Decisions Context:\n';
        if (matchedDecisions && matchedDecisions.length > 0) {
            matchedDecisions.forEach((m: any) => {
                contextString += `- ${m.title}: ${m.summary} (Status: ${m.status})\n`;
            });
        } else {
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

    async createManual(jwt: string, orgId: string, userId: string, dto: CreateManualDecisionDto) {
        const supabase = this.supabaseService.getAdminClient();

        if (!orgId) throw new Error('User has no org_id');

        // Generate embedding from the user's description
        let embedding: number[] | null = null;
        try {
            const embeddingRes = await this.ai_google.models.embedContent({
                model: 'gemini-embedding-001',
                contents: `${dto.title}. ${dto.description}`,
            });
            embedding = embeddingRes.embeddings?.[0]?.values ?? null;
        } catch (err) {
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

        if (error) throw error;
        return data;
    }
}
