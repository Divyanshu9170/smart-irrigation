import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoAction } from './auto-action.entity';
import { Device } from '../devices/device.entity';

@Injectable()
export class AutoActionsService {
  constructor(
    @InjectRepository(AutoAction)
    private autoRepo: Repository<AutoAction>,

    @InjectRepository(Device)
    private deviceRepo: Repository<Device>,
  ) {}

  async createAction(deviceId: number, action: string, userId: number) {
    await this.verifyDeviceOwnership(deviceId, userId);

    return this.autoRepo.save({
      deviceId: deviceId,
      action: action,
      createdAt: new Date(),
    });
  }

  async getRecentActions(deviceId: number, userId: number) {
    await this.verifyDeviceOwnership(deviceId, userId);

    return this.autoRepo.find({
      where: {
        deviceId: deviceId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 5,
    });
  }

  // 🔒 Feature 3: AutoAction.deviceId is a plain number, not a relation,
  // so ownership has to be checked explicitly against the Device table
  // before any read/write is allowed.
  private async verifyDeviceOwnership(deviceId: number, userId: number) {
    const device = await this.deviceRepo.findOne({
      where: { id: deviceId },
      relations: ['owner'],
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (!device.owner || device.owner.id !== userId) {
      throw new ForbiddenException('You do not own this device');
    }
  }
}