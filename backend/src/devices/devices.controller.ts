import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

let activeCameraUrl = 'http://10.97.53.164';
let lastCameraPing: Date | null = null;

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  // 📸 Get current active ESP32-CAM URL & status
  @Get('camera-url')
  getCameraUrl() {
    return {
      url: activeCameraUrl,
      lastSeen: lastCameraPing,
      isOnline: lastCameraPing
        ? Date.now() - lastCameraPing.getTime() < 60000
        : false,
    };
  }

  // 📸 Register or update ESP32-CAM URL (called by ESP32-CAM on boot or user from frontend UI)
  @Post('camera-url')
  setCameraUrl(@Body() body: { url?: string; ip?: string }) {
    let target = (body?.url || body?.ip || '').trim();
    if (!target) {
      return { ok: false, error: 'Missing url or ip parameter' };
    }
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `http://${target}`;
    }
    target = target.replace(/\/+$/, '');
    activeCameraUrl = target;
    lastCameraPing = new Date();
    console.log(`📸 ESP32-CAM URL updated to: ${activeCameraUrl}`);
    return { ok: true, url: activeCameraUrl, updatedAt: lastCameraPing };
  }

  // 📸 Proxy capture directly from camera (eliminates CORS and browser LAN IP isolation issues)
  @Get('camera-capture')
  async proxyCapture(@Res() res: Response) {
    if (!activeCameraUrl) {
      return res
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json({ error: 'No camera configured' });
    }
    try {
      const captureUrl = `${activeCameraUrl}/capture?t=${Date.now()}`;
      const response = await fetch(captureUrl, {
        signal: AbortSignal.timeout(3500),
      });
      if (!response.ok) {
        return res
          .status(HttpStatus.BAD_GATEWAY)
          .json({ error: `Camera returned HTTP ${response.status}` });
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      lastCameraPing = new Date();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(buffer);
    } catch (err: any) {
      return res.status(HttpStatus.GATEWAY_TIMEOUT).json({
        error: 'Camera capture timed out or offline',
        details: err?.message,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.devicesService.create({
      ...body,
      ownerId: req.user.id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req: any) {
    return this.devicesService.findAllForUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/pump')
  setPump(
    @Param('id') id: number,
    @Body() body: { status: 'ON' | 'OFF' },
    @Request() req: any,
  ) {
    return this.devicesService.setPumpStatus(id, body.status, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/relay')
  getRelayStatus(@Param('id') id: number, @Request() req: any) {
    return this.devicesService.getRelayStatus(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/relay')
  setRelay(
    @Param('id') id: number,
    @Body()
    body: {
      relay:
        | 'water'
        | 'nitrogen'
        | 'phosphorus'
        | 'potassium'
        | 'fan'
        | 'bulb';
      status: 'ON' | 'OFF';
    },
    @Request() req: any,
  ) {
    return this.devicesService.setRelay(
      id,
      body.relay,
      body.status,
      req.user.id,
    );
  }
}