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
exports.GithubController = void 0;
const common_1 = require("@nestjs/common");
const github_service_1 = require("./github.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const config_1 = require("@nestjs/config");
const zod_1 = require("zod");
const crypto = __importStar(require("crypto"));
const ConnectSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    redirectUri: zod_1.z.string().optional(),
    dataRangeDays: zod_1.z.union([zod_1.z.literal(7), zod_1.z.literal(30), zod_1.z.literal(0)]).default(30),
});
let GithubController = class GithubController {
    githubService;
    configService;
    constructor(githubService, configService) {
        this.githubService = githubService;
        this.configService = configService;
    }
    async connect(req, body) {
        console.log('[GithubController] Received connect request:', body);
        const parsed = ConnectSchema.safeParse(body);
        if (!parsed.success) {
            console.error('[GithubController] Body validation failed:', parsed.error.format());
            throw new common_1.BadRequestException(parsed.error.format());
        }
        const { id, orgId } = req.user;
        return this.githubService.connectGithub(orgId, id, parsed.data.code, parsed.data.dataRangeDays, parsed.data.redirectUri);
    }
    async status(req) {
        const { orgId } = req.user;
        return this.githubService.getIntegrationStatus(orgId);
    }
    async actionItems(req) {
        const { orgId } = req.user;
        return this.githubService.getActionItems(orgId);
    }
    async handleWebhook(orgId, payload, event, signature, req) {
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        if (!this.isValidSignature(signature, rawBody)) {
            throw new common_1.UnauthorizedException('Invalid GitHub webhook signature');
        }
        setImmediate(() => {
            this.githubService.processWebhookEvent(orgId, event, payload).catch(err => console.error('GitHub webhook processing failed:', err));
        });
        return { status: 'queued' };
    }
    isValidSignature(signature, rawBody) {
        const secret = this.configService.get('GITHUB_WEBHOOK_SECRET');
        if (!secret)
            return true;
        if (!signature)
            return false;
        const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
        }
        catch {
            return false;
        }
    }
};
exports.GithubController = GithubController;
__decorate([
    (0, common_1.Post)('integrations/github/connect'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GithubController.prototype, "connect", null);
__decorate([
    (0, common_1.Get)('integrations/github/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GithubController.prototype, "status", null);
__decorate([
    (0, common_1.Get)('github/action-items'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GithubController.prototype, "actionItems", null);
__decorate([
    (0, common_1.Post)('webhooks/github/:orgId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-github-event')),
    __param(3, (0, common_1.Headers)('x-hub-signature-256')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], GithubController.prototype, "handleWebhook", null);
exports.GithubController = GithubController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [github_service_1.GithubService,
        config_1.ConfigService])
], GithubController);
//# sourceMappingURL=github.controller.js.map