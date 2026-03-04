"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionController = void 0;
const common_1 = require("@nestjs/common");
const ingestion_service_1 = require("../ingestion.service");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
let IngestionController = class IngestionController {
    ingestionService;
    configService;
    constructor(ingestionService, configService) {
        this.ingestionService = ingestionService;
        this.configService = configService;
    }
    async handleSlackWebhook(orgId, payload, signature, timestamp, req) {
        if (payload.type === 'url_verification') {
            return { challenge: payload.challenge };
        }
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        if (!this.isValidSlackSignature(signature, timestamp, rawBody)) {
            throw new common_1.UnauthorizedException('Invalid Slack signature');
        }
        if (payload.event?.bot_id || payload.event?.subtype === 'bot_message') {
            return { status: 'ignored (bot)' };
        }
        await this.queueEventSafely(payload, orgId);
        return { status: 'queued' };
    }
    isValidSlackSignature(signature, timestamp, rawBody) {
        const secret = this.configService.get('SLACK_WEBHOOK_SECRET');
        if (!secret)
            return true;
        if (!signature || !timestamp)
            return false;
        const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5);
        if (parseInt(timestamp, 10) < fiveMinutesAgo)
            return false;
        const sigBasestring = `v0:${timestamp}:${rawBody}`;
        const mySignature = 'v0=' + crypto.createHmac('sha256', secret).update(sigBasestring).digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
        }
        catch (e) {
            return false;
        }
    }
    async queueEventSafely(payload, orgId) {
        try {
            await this.ingestionService.queueSlackEvent(payload, orgId);
        }
        catch (e) {
            console.error('Failed to queue webhook event:', e);
        }
    }
};
exports.IngestionController = IngestionController;
__decorate([
    (0, common_1.Post)('slack/:orgId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-slack-signature')),
    __param(3, (0, common_1.Headers)('x-slack-request-timestamp')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], IngestionController.prototype, "handleSlackWebhook", null);
exports.IngestionController = IngestionController = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [ingestion_service_1.IngestionService,
        config_1.ConfigService])
], IngestionController);
//# sourceMappingURL=ingestion.controller.js.map