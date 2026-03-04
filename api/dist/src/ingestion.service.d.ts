import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class IngestionService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private readonly logger;
    private boss;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    queueSlackEvent(payload: any, orgId: string): Promise<any>;
}
