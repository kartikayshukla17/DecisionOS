import { IngestionService } from '../ingestion.service';
import { ConfigService } from '@nestjs/config';
export declare class IngestionController {
    private readonly ingestionService;
    private readonly configService;
    constructor(ingestionService: IngestionService, configService: ConfigService);
    handleSlackWebhook(orgId: string, payload: any, signature: string, timestamp: string, req: any): Promise<{
        challenge: any;
        status?: undefined;
    } | {
        status: string;
        challenge?: undefined;
    }>;
    private isValidSlackSignature;
    private queueEventSafely;
}
