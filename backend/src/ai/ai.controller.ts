import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // 🔒 Feature 6: requires a logged-in user (per requirements).
  // Accepts multipart/form-data with the file under the "image" field.
  @UseGuards(JwtAuthGuard)
  @Post('analyze')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 }, // 8MB cap
    }),
  )
  async analyze(@UploadedFile() image: Express.Multer.File) {
    if (!image) {
      throw new BadRequestException(
        'No image file received. Attach it under the "image" field.',
      );
    }
    return this.aiService.analyzeImage(image);
  }
}
