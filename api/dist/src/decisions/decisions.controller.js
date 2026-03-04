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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionsController = void 0;
const common_1 = require("@nestjs/common");
const decisions_service_1 = require("../decisions.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const zod_1 = require("zod");
const DraftRequestSchema = zod_1.z.object({
    question: zod_1.z.string().min(5).max(1000)
});
const CreateDecisionSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(200),
    description: zod_1.z.string().min(10).max(2000),
    status: zod_1.z.enum(['pending', 'approved', 'critical']).optional(),
    source_url: zod_1.z.string().url().optional(),
});
let DecisionsController = class DecisionsController {
    decisionsService;
    constructor(decisionsService) {
        this.decisionsService = decisionsService;
    }
    async getQueue(req) {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            throw new common_1.UnauthorizedException('No token');
        const token = authHeader.split(' ')[1];
        const { orgId } = req.user;
        return this.decisionsService.getQueue(token, orgId);
    }
    async draftResponse(req, body) {
        const validationResult = DraftRequestSchema.safeParse(body);
        if (!validationResult.success) {
            throw new common_1.BadRequestException(validationResult.error.format());
        }
        const { question } = validationResult.data;
        const authHeader = req.headers.authorization;
        if (!authHeader)
            throw new common_1.UnauthorizedException('No token');
        const token = authHeader.split(' ')[1];
        const { orgId } = req.user;
        return this.decisionsService.draftResponse(token, orgId, question);
    }
    async createDecision(req, body) {
        const parsed = CreateDecisionSchema.safeParse(body);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.format());
        const authHeader = req.headers.authorization;
        if (!authHeader)
            throw new common_1.UnauthorizedException('No token');
        const token = authHeader.split(' ')[1];
        const { id, orgId } = req.user;
        return this.decisionsService.createManual(token, orgId, id, parsed.data);
    }
};
exports.DecisionsController = DecisionsController;
__decorate([
    (0, common_1.Get)('queue'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DecisionsController.prototype, "getQueue", null);
__decorate([
    (0, common_1.Post)('draft'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DecisionsController.prototype, "draftResponse", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DecisionsController.prototype, "createDecision", null);
exports.DecisionsController = DecisionsController = __decorate([
    (0, common_1.Controller)('decisions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [decisions_service_1.DecisionsService])
], DecisionsController);
//# sourceMappingURL=decisions.controller.js.map