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
var OnboardingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let OnboardingService = OnboardingService_1 = class OnboardingService {
    supabaseService;
    logger = new common_1.Logger(OnboardingService_1.name);
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async getStatus(userId) {
        const adminClient = this.supabaseService.getAdminClient();
        const { data: user, error } = await adminClient
            .from('users')
            .select('onboarding_completed, github_connected, gmail_connected, calendar_connected')
            .eq('id', userId)
            .single();
        if (error || !user) {
            this.logger.warn(`No user row found for id=${userId}`);
            return {
                onboarding_completed: false,
                github_connected: false,
                gmail_connected: false,
                calendar_connected: false,
            };
        }
        return user;
    }
    async complete(userId) {
        const adminClient = this.supabaseService.getAdminClient();
        const { error } = await adminClient
            .from('users')
            .update({ onboarding_completed: true })
            .eq('id', userId);
        if (error)
            throw error;
        return { success: true };
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = OnboardingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map