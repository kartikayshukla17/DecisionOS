import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { IngestionService } from './ingestion.service';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { IntelligenceService } from './intelligence.service';
import { DecisionsModule } from './decisions/decisions.module';
import { DecisionsService } from './decisions.service';
// New modules
import { CommonModule } from './common/common.module';
import { GithubModule } from './github/github.module';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    AuthModule,
    CommonModule,       // Global: provides AiSieveService to all modules
    IngestionModule,
    IntelligenceModule,
    DecisionsModule,
    GithubModule,
    OnboardingModule,
  ],
  controllers: [AppController],
  providers: [AppService, IngestionService, IntelligenceService, DecisionsService],
})
export class AppModule { }
