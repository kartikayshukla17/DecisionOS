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
var IngestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let IngestionService = IngestionService_1 = class IngestionService {
    configService;
    logger = new common_1.Logger(IngestionService_1.name);
    boss;
    constructor(configService) {
        this.configService = configService;
    }
    async onModuleInit() {
        const dbUrl = this.configService.get('DATABASE_URL');
        if (!dbUrl) {
            throw new Error('DATABASE_URL is not defined in the environment variables');
        }
        const { PgBoss } = require('pg-boss');
        this.boss = new PgBoss({
            connectionString: dbUrl,
            idleTimeoutMillis: 10000
        });
        this.boss.on('error', (error) => this.logger.error('pg-boss error:', error));
        await this.boss.start();
        this.logger.log('pg-boss started successfully');
    }
    async onModuleDestroy() {
        if (this.boss) {
            await this.boss.stop();
            this.logger.log('pg-boss stopped');
        }
    }
    async queueSlackEvent(payload, orgId) {
        const queueName = 'slack-ingestion';
        const jobId = await this.boss.send(queueName, {
            orgId,
            platform: 'slack',
            rawPayload: payload,
        }, {
            retryLimit: 3,
            retryDelay: 60,
            expireInSeconds: 60 * 60,
        });
        this.logger.log(`Queued Slack event. Job ID: ${jobId}`);
        return jobId;
    }
};
exports.IngestionService = IngestionService;
exports.IngestionService = IngestionService = IngestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], IngestionService);
//# sourceMappingURL=ingestion.service.js.map