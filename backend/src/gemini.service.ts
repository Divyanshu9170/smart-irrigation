import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    console.log('🔑 Gemini API Key loaded:', apiKey ? 'YES ✅' : 'NO ❌');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async detectDisease(base64Image: string, promptText: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent([
        promptText,
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
      ]);
      const response = result.response.text().trim();
      console.log('🌿 Gemini raw response:', response);
      return response;
    } catch (error) {
      console.log('❌ Gemini error:', error);
      return 'Disease: Unknown | Severity: None | Treatment: Could not analyze image | Prevention: Please retry with valid API key';
    }
  }
}