"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const supabase_module_1 = require("./supabase/supabase.module");
const auth_module_1 = require("./auth/auth.module");
const ingestion_module_1 = require("./ingestion/ingestion.module");
const ingestion_service_1 = require("./ingestion.service");
const intelligence_module_1 = require("./intelligence/intelligence.module");
const intelligence_service_1 = require("./intelligence.service");
const decisions_module_1 = require("./decisions/decisions.module");
const decisions_service_1 = require("./decisions.service");
const common_module_1 = require("./common/common.module");
const github_module_1 = require("./github/github.module");
const onboarding_module_1 = require("./onboarding/onboarding.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            supabase_module_1.SupabaseModule,
            auth_module_1.AuthModule,
            common_module_1.CommonModule,
            ingestion_module_1.IngestionModule,
            intelligence_module_1.IntelligenceModule,
            decisions_module_1.DecisionsModule,
            github_module_1.GithubModule,
            onboarding_module_1.OnboardingModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, ingestion_service_1.IngestionService, intelligence_service_1.IntelligenceService, decisions_service_1.DecisionsService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map