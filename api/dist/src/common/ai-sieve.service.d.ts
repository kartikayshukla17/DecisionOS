import { ConfigService } from '@nestjs/config';
export interface SievedDecision {
    title: string;
    summary: string;
    commitments: Array<{
        description: string;
        owner_name: string;
    }>;
}
export declare class AiSieveService {
    private configService;
    private readonly logger;
    private groq;
    constructor(configService: ConfigService);
    extract(rawText: string, platform: string): Promise<SievedDecision | null>;
}
