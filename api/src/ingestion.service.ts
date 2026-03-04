import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class IngestionService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(IngestionService.name);
    private boss: any;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        const dbUrl = this.configService.get<string>('DATABASE_URL');
        if (!dbUrl) {
            throw new Error('DATABASE_URL is not defined in the environment variables');
        }

        const { PgBoss } = require('pg-boss');
        this.boss = new PgBoss({
            connectionString: dbUrl,
            idleTimeoutMillis: 10000
        });

        this.boss.on('error', (error: any) => this.logger.error('pg-boss error:', error));

        await this.boss.start();
        this.logger.log('pg-boss started successfully');
    }

    async onModuleDestroy() {
        if (this.boss) {
            await this.boss.stop();
            this.logger.log('pg-boss stopped');
        }
    }

    async queueSlackEvent(payload: any, orgId: string) {
        const queueName = 'slack-ingestion';

        // We send the raw payload to the queue
        const jobId = await this.boss.send(queueName, {
            orgId,
            platform: 'slack',
            rawPayload: payload,
        }, {
            retryLimit: 3,
            retryDelay: 60, // 1 minute
            expireInSeconds: 60 * 60, // 1 hour to process before failing
        });

        this.logger.log(`Queued Slack event. Job ID: ${jobId}`);
        return jobId;
    }
}
