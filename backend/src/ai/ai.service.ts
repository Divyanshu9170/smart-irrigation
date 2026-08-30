import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import { GeminiService, PlantAnalysisResult } from '../gemini.service';

export interface AiAnalysisResponse extends PlantAnalysisResult {
  imageUrl: string;
}

@Injectable()
export class AiService {
  constructor(private readonly geminiService: GeminiService) {}

  async analyzeImage(
    file: Express.Multer.File | undefined,
  ): Promise<AiAnalysisResponse> {
    if (!file) {
      throw new BadRequestException('No image file received.');
    }

    // ✅ Handle invalid images gracefully
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'Uploaded file is not a valid image. Please upload a JPG or PNG.',
      );
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded image file is empty.');
    }

    // 💾 Save uploaded image into uploads/ (separate from the existing
    // images/ folder used by the older sensor-readings upload-image flow)
    const uploadsDir = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const safeOriginalName = (file.originalname || 'image.jpg').replace(
      /[^a-zA-Z0-9.\-_]/g,
      '_',
    );
    const fileName = `ai_${Date.now()}_${safeOriginalName}`;
    const savePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(savePath, file.buffer);
    console.log('✅ AI analysis image saved:', savePath);

    const base64Image = file.buffer.toString('base64');

    try {
      const result = await this.geminiService.analyzeImageStructured(base64Image);
      return {
        ...result,
        imageUrl: `http://localhost:5000/uploads/${fileName}`,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'GEMINI_API_KEY_MISSING') {
        // ✅ Friendly error when the Gemini key isn't configured
        throw new ServiceUnavailableException(
          'AI analysis is temporarily unavailable — the Gemini API key is not configured on the server. Please contact the site administrator.',
        );
      }

      console.log('❌ AI analysis failed:', error);
      throw new BadRequestException(
        'Could not analyze this image. Please try a clearer photo of the plant.',
      );
    }
  }
}
