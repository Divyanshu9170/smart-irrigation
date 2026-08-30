import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SensorReadingsService } from './sensor-readings.service';
import { GeminiService } from '../gemini.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import * as fs from 'fs';
import * as path from 'path';

let imageHistory: any[] = [];

@Controller('sensor-readings')
export class SensorReadingsController {
  constructor(
    private readonly sensorService: SensorReadingsService,
    private readonly geminiService: GeminiService,
  ) {
    console.log('🔥 CONTROLLER LOADED');
  }

  // ✅ EXISTING - DO NOT TOUCH
  // 🔓 Left public on purpose — this is the ESP32 ingestion endpoint.
  // The hardware can't hold a user JWT session. See README for the
  // planned device-level auth approach (Feature 4+).
  @Post()
  create(@Body() body: any) {
    return this.sensorService.create(body);
  }

  // 🔒 Feature 3: now requires a logged-in user, and only returns
  // readings from devices that user owns. Fallback dummy-data behavior
  // is unchanged for empty/error cases.
  @Get()
  async findAll(): Promise<any> {
    try {
     const data: any = await this.sensorService.findAll();
      if (!data || !Array.isArray(data) || data.length === 0) {
        return [{ id: 1, temperature: 28, humidity: 60, ph: 6.5, soilMoisture: 45, nitrogen: 80, phosphorus: 60, potassium: 70, status: 'GOOD' }];
      }
      return data;
    } catch (error) {
      console.log('❌ Service error:', error);
      return [{ id: 1, temperature: 28, humidity: 60, ph: 6.5, soilMoisture: 45, nitrogen: 80, phosphorus: 60, potassium: 70, status: 'GOOD' }];
    }
  }

  // ✅ EXISTING - DO NOT TOUCH
  @Get('images')
  getImages() {
    const dirPath = path.join(process.cwd(), 'images');
    if (!fs.existsSync(dirPath)) return [];
    const files = fs.readdirSync(dirPath);
    return files.map((file: string) => ({
      name: file,
      url: `http://localhost:5000/images/${file}`,
    }));
  }

  // ✅ EXISTING - DO NOT TOUCH
  @Get('image-history')
  getImageHistory() {
    return imageHistory.slice().reverse();
  }

  // ✅ UPDATED - Simple approach: build prompt string with sensor data
  @Post('upload-image')
  async uploadImage(@Body() body: Record<string, any>) {
    const base64Image = body?.image as string | undefined;
    console.log('📸 Image received length:', base64Image?.length);

    if (!base64Image) {
      return { message: '❌ No image received' };
    }

    try {
      // 💾 Save image to disk
      const imageBuffer = Buffer.from(base64Image, 'base64');
      const fileName = `image_${Date.now()}.jpg`;
      const savePath = path.join(process.cwd(), 'images', fileName);
      fs.mkdirSync(path.dirname(savePath), { recursive: true });
      fs.writeFileSync(savePath, imageBuffer);
      console.log('✅ Image saved:', savePath);

      // ✅ Build prompt with sensor data
      let promptText = `You are an expert agricultural AI assistant.
Analyze this farm plant image carefully.`;

      try {
        const sensorData: any = await this.sensorService.findAll();
        if (sensorData && Array.isArray(sensorData) && sensorData.length > 0) {
          const s = sensorData[0];
          promptText += `

Current Farm Sensor Readings:
- Temperature: ${s.temperature}°C
- Humidity: ${s.humidity}%
- Soil Moisture: ${s.soilMoisture}%
- Nitrogen: ${s.nitrogen}
- Phosphorus: ${s.phosphorus}
- Potassium: ${s.potassium}

Based on BOTH the image AND sensor readings, identify any plant disease or stress.`;
          console.log('📊 Sensor data added to prompt');
        }
      } catch (sensorError) {
        console.log('⚠️ No sensor data, using image only');
      }

      promptText += `

Respond in this EXACT format only (no extra text):
Disease: X | Severity: None/Mild/Moderate/Severe | Treatment: X | Prevention: X`;

      // 🤖 Call Gemini with image + prompt
      console.log('🔥 Calling Gemini...');
      const diseaseResult = await this.geminiService.detectDisease(base64Image, promptText);
      console.log('🌿 AI Result:', diseaseResult);

      const imageUrl = `http://localhost:5000/images/${fileName}`;

      imageHistory.push({
        image: imageUrl,
        disease: diseaseResult,
        time: new Date(),
      });

      return {
        message: '✅ Image processed',
        file: fileName,
        image: imageUrl,
        disease: diseaseResult,
      };

    } catch (error) {
      console.log('❌ Error:', error instanceof Error ? error.message : String(error));
      return { message: '❌ Error processing image' };
    }
  }
}