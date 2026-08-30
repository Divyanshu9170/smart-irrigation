import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from '../gemini.service';

@Module({
  controllers: [AiController],
  // ✅ GeminiService is already only provided inside SensorReadingsModule
  // (not exported from there), so it's registered here too — same class,
  // a separate instance scoped to this module. No changes needed to
  // sensor-readings.module.ts.
  providers: [AiService, GeminiService],
})
export class AiModule {}
