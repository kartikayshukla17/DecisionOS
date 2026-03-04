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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let JwtAuthGuard = class JwtAuthGuard {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new common_1.UnauthorizedException('No authorization header');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new common_1.UnauthorizedException('No token provided');
        }
        const user = await this.supabaseService.getUserFromToken(token);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
        let orgId = user.user_metadata?.org_id;
        if (!orgId) {
            const adminClient = this.supabaseService.getAdminClient();
            const { data } = await adminClient
                .from('users')
                .select('org_id')
                .eq('id', user.id)
                .single();
            if (data?.org_id) {
                orgId = data.org_id;
            }
        }
        request.user = {
            id: user.id,
            email: user.email,
            orgId: orgId,
        };
        return true;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map