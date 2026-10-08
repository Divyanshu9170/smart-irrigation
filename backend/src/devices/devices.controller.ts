import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';

import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

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
    return this.devicesService.setPumpStatus(
      id,
      body.status,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/relay')
  getRelayStatus(
    @Param('id') id: number,
    @Request() req: any,
  ) {
    return this.devicesService.getRelayStatus(
      id,
      req.user.id,
    );
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