import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  // 🔒 Feature 3: ownerId is now taken from the authenticated user's JWT,
  // never from the request body — a user can no longer register a device
  // under someone else's account by passing a different ownerId.
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.devicesService.create({ ...body, ownerId: req.user.id });
  }

  // 🔒 Feature 3: only returns devices owned by the logged-in user
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req: any) {
    return this.devicesService.findAllForUser(req.user.id);
  }

  // 🔌 Feature 5: manual pump/relay control. Ownership is verified in
  // the service — a user can't toggle a pump on a device they don't own.
  @UseGuards(JwtAuthGuard)
  @Post(':id/pump')
  setPump(
    @Param('id') id: number,
    @Body() body: { status: 'ON' | 'OFF' },
    @Request() req: any,
  ) {
    return this.devicesService.setPumpStatus(id, body.status, req.user.id);
  }
}
