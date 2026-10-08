import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

// 🤖 Feature 6 — structured shape returned by analyzeImageStructured()
export interface PlantAnalysisResult {
  disease: string;
  confidence: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
  fertilizerSuggestion: string;
  wateringSuggestion: string;
}

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    console.log('🔑 Gemini API Key loaded:', apiKey ? 'YES ✅' : 'NO ❌');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // ✅ EXISTING - DO NOT TOUCH (still used by sensor-readings' upload-image flow)
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

  // 🤖 Feature 6 — asks Gemini for a strict JSON response matching
  // PlantAnalysisResult, instead of the pipe-delimited string format
  // used by detectDisease(). Kept as a separate method so the existing
  // upload-image flow (and its parsing on the frontend) is untouched.
  async analyzeImageStructured(base64Image: string): Promise<PlantAnalysisResult> {
    if (!process.env.GEMINI_API_KEY) {
      // Distinguishable error so the controller can return a friendly,
      // specific message instead of a generic failure.
      throw new Error('GEMINI_API_KEY_MISSING');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an expert agricultural plant pathologist AI.
Analyze this plant image and respond with ONLY valid JSON — no markdown
fences, no extra commentary — matching exactly this shape:

{
  "disease": "string - name of the detected disease, or \\"Healthy\\" if none",
  "confidence": number between 0 and 1,
  "severity": "LOW" | "MEDIUM" | "HIGH",
  "recommendation": "string - what the farmer should do next",
  "fertilizerSuggestion": "string - fertilizer advice",
  "wateringSuggestion": "string - watering advice"
}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
    ]);

    const rawText = result.response.text().trim();
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.log('❌ Gemini structured response was not valid JSON:', rawText);
      throw new Error('GEMINI_INVALID_RESPONSE');
    }

    const allowedSeverities = ['LOW', 'MEDIUM', 'HIGH'];

    return {
      disease: typeof parsed.disease === 'string' ? parsed.disease : 'Unknown',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      severity: allowedSeverities.includes(parsed.severity) ? parsed.severity : 'LOW',
      recommendation:
        typeof parsed.recommendation === 'string'
          ? parsed.recommendation
          : 'No recommendation available.',
      fertilizerSuggestion:
        typeof parsed.fertilizerSuggestion === 'string'
          ? parsed.fertilizerSuggestion
          : 'No fertilizer suggestion available.',
      wateringSuggestion:
        typeof parsed.wateringSuggestion === 'string'
          ? parsed.wateringSuggestion
          : 'No watering suggestion available.',
    };
  }
}