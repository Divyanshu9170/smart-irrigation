import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SensorReading } from './sensor-reading.entity';
import { Device } from '../devices/device.entity';

@Injectable()
export class SensorReadingsService {
  constructor(
    @InjectRepository(SensorReading)
    private sensorRepo: Repository<SensorReading>,

    @InjectRepository(Device)
    private deviceRepo: Repository<Device>,
  ) {}

  // ✅ CREATE SENSOR DATA
  async create(dto: any) {
    const device = await this.deviceRepo.findOne({
      where: { id: dto.deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const reading = this.sensorRepo.create({
      temperature: dto.temperature,
      humidity: dto.humidity,
      ph: dto.ph,
      soilMoisture: dto.soilMoisture,
      nitrogen: dto.nitrogen,
      phosphorus: dto.phosphorus,
      potassium: dto.potassium,
      device: device,
    });

    return this.sensorRepo.save(reading);
  }

  // ✅ GET ALL (LATEST FIRST)
  // ⚠️ Not user-scoped — kept as-is (still used as the unscoped fallback
  // path was before auth existed). Route-level scoping is applied via
  // findAllForUser() below, called from the guarded controller route.
  async findAll() {
    return this.sensorRepo.find({
      relations: ['device'],
      order: { createdAt: 'DESC' },
    });
  }

  // ✅ GET ALL FOR ONE USER (Feature 3 — only readings from devices
  // owned by this user)
  async findAllForUser(userId: number) {
    return this.sensorRepo.find({
      where: { device: { owner: { id: userId } } },
      relations: ['device', 'device.owner'],
      order: { createdAt: 'DESC' },
    });
  }
}