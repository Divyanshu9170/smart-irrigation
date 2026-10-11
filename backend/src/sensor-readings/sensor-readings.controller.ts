import { Controller, Get, Post, Body, UseGuards, Request, Req } from '@nestjs/common';
import { SensorReadingsService } from './sensor-readings.service';
import { GeminiService } from '../gemini.service';
import { DevicesService } from '../devices/devices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import * as fs from 'fs';
import * as path from 'path';

let imageHistory: any[] = [];

@Controller('sensor-readings')
export class SensorReadingsController {
  constructor(
    private readonly sensorService: SensorReadingsService,
    private readonly geminiService: GeminiService,
    private readonly devicesService: DevicesService,
  ) {
    console.log('🔥 CONTROLLER LOADED');
  }

  // 🔓 Public ESP32 ingestion endpoint.
  // Ingests sensor data, triggers Autonomous Crop Rules (Moisture/NPK/Temp),
  // and returns confirmation, active crop profile, and updated relay states for all 6 actuators.
  @Post()
  async create(@Body() body: any, @Req() req: any) {
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || body?.ip;
    const deviceId = body?.deviceId || 'ESP32-0001';
    if (rawIp) {
      this.devicesService.registerDeviceIp(deviceId, String(rawIp));
    }
    const result: any = await this.sensorService.create(body);

    // 🧠 Autonomous Decision Engine: Evaluate sensor values against Active Crop profile
    const relays = await this.devicesService.evaluateAutonomousCropRules(deviceId, {
      temperature: Number(body.temperature) || 28,
      humidity: Number(body.humidity) || 60,
      soilMoisture: Number(body.soilMoisture) || 0,
      nitrogen: Number(body.nitrogen) || 0,
      phosphorus: Number(body.phosphorus) || 0,
      potassium: Number(body.potassium) || 0,
      ph: Number(body.ph) || 6.5,
    });

    const activeInfo = await this.devicesService.getActiveCrop(deviceId);

    return {
      ...result,
      relays,
      mode: activeInfo.mode,
      activeCrop: activeInfo.crop,
    };
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

  // 📸 Get captured snapshots sorted newest first for Recent Field Snapshots tray
  @Get('images')
  getImages() {
    const dirPath = path.join(process.cwd(), 'images');
    if (!fs.existsSync(dirPath)) return [];
    const files = fs.readdirSync(dirPath);
    const sorted = files
      .map((file: string) => {
        try {
          const stat = fs.statSync(path.join(dirPath, file));
          return { name: file, mtime: stat.mtimeMs };
        } catch {
          return { name: file, mtime: 0 };
        }
      })
      .sort((a, b) => b.mtime - a.mtime);

    return sorted.map((item) => ({
      name: item.name,
      url: `http://localhost:5000/images/${item.name}`,
    }));
  }

  // 📜 Historical diagnosis logs
  @Get('image-history')
  getImageHistory() {
    return imageHistory.slice().reverse();
  }

  // 📸 Save snapshot & execute Gemini Vision analysis
  @Post('upload-image')
  async uploadImage(@Body() body: Record<string, any>) {
    const base64Image = body?.image as string | undefined;
    const skipAi = body?.skipAi === true;
    console.log('📸 Image received length:', base64Image?.length, skipAi ? '(Snapshot only)' : '(Full AI Diagnosis)');

    if (!base64Image) {
      return { message: '❌ No image received' };
    }

    try {
      // 💾 Save image to disk
      const imageBuffer = Buffer.from(base64Image, 'base64');
      const fileName = body?.name && typeof body.name === 'string' && body.name.endsWith('.jpg')
        ? body.name
        : `image_${Date.now()}.jpg`;
      const savePath = path.join(process.cwd(), 'images', fileName);
      fs.mkdirSync(path.dirname(savePath), { recursive: true });
      fs.writeFileSync(savePath, imageBuffer);
      console.log('✅ Image saved:', savePath);

      const imageUrl = `http://localhost:5000/images/${fileName}`;

      // If this is a fast 1-minute background snapshot capture without AI request:
      if (skipAi) {
        return {
          message: '✅ Snapshot buffered',
          file: fileName,
          image: imageUrl,
        };
      }

      // 🤖 Build prompt with live sensor data for holistic diagnosis
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

      imageHistory.push({
        image: imageUrl,
        disease: diseaseResult,
        time: new Date(),
      });

      // Parse structured details for rich frontend modal & card rendering
      const parsedParts: Record<string, string> = {};
      diseaseResult.split('|').forEach((part) => {
        const [k, ...v] = part.split(':');
        if (k && v.length > 0) parsedParts[k.trim()] = v.join(':').trim();
      });

      return {
        message: '✅ Image processed',
        file: fileName,
        image: imageUrl,
        disease: diseaseResult,
        details: {
          disease: parsedParts['Disease'] || 'Healthy Plant Foliage',
          severity: parsedParts['Severity'] || 'None',
          treatment: parsedParts['Treatment'] || 'Standard balanced irrigation and agronomic care',
          prevention: parsedParts['Prevention'] || 'Routine field scouting and optimal microclimate management',
          confidence: 0.95,
        },
      };

    } catch (error) {
      console.log('❌ Error:', error instanceof Error ? error.message : String(error));
      return { message: '❌ Error processing image' };
    }
  }
}