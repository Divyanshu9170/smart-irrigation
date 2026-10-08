import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AutoActionsService } from './auto-actions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('auto-actions')
export class AutoActionsController {
  constructor(private autoService: AutoActionsService) {}

  // 🔒 Feature 3: requires login; service verifies the device belongs
  // to the requesting user before logging the action.
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: { deviceId: number; action: string }, @Request() req: any) {
    return this.autoService.createAction(body.deviceId, body.action, req.user.id);
  }

  // 🔒 Feature 3: requires login; service verifies ownership before
  // returning any actions for the given device.
  @UseGuards(JwtAuthGuard)
  @Get(':deviceId')
  getRecent(@Param('deviceId') deviceId: number, @Request() req: any) {
    return this.autoService.getRecentActions(deviceId, req.user.id);
  }
}
