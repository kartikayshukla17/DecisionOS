import { Module, Global } from '@nestjs/common';
import { AiSieveService } from './ai-sieve.service';

@Global()
@Module({
    providers: [AiSieveService],
    exports: [AiSieveService],
})
export class CommonModule { }
