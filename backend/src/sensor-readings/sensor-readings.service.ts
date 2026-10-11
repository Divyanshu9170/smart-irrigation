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

  // ============================================
  // CREATE SENSOR DATA
  // ============================================
  async create(dto: any) {
    // ESP32 sends a string such as "ESP32-0001".
    // Search using Device.deviceId, NOT Device.id.
    let device = await this.deviceRepo.findOne({
      where: {
        deviceId: dto.deviceId,
      },
    });

    if (!device && dto.deviceId && !isNaN(Number(dto.deviceId))) {
      device = await this.deviceRepo.findOne({
        where: { id: Number(dto.deviceId) },
      });
    }

    if (!device) {
      throw new NotFoundException(
        `Device "${dto.deviceId}" not found`,
      );
    }

    // If pH probe is broken/missing (returns 0 or <= 1), fallback to realistic neutral baseline 6.5
    const rawPh = Number(dto.ph);
    const safePh = !rawPh || rawPh <= 1 ? 6.5 : rawPh;

    // Create the sensor reading and attach the actual Device entity.
    const reading = this.sensorRepo.create({
      temperature: dto.temperature,
      humidity: dto.humidity,
      ph: safePh,
      soilMoisture: dto.soilMoisture,
      nitrogen: dto.nitrogen,
      phosphorus: dto.phosphorus,
      potassium: dto.potassium,
      device: device,
    });

    return this.sensorRepo.save(reading);
  }

  // ============================================
  // GET ALL SENSOR READINGS
  // ============================================
  async findAll() {
    const readings = await this.sensorRepo.find({
      relations: ['device'],
      order: {
        createdAt: 'DESC',
      },
    });

    return readings.map((r) => ({
      ...r,
      ph: !r.ph || Number(r.ph) <= 1 ? 6.5 : Number(r.ph),
    }));
  }

  // ============================================
  // GET SENSOR READINGS FOR ONE USER
  // ============================================
  async findAllForUser(userId: number) {
    const readings = await this.sensorRepo.find({
      where: {
        device: {
          owner: {
            id: userId,
          },
        },
      },
      relations: ['device', 'device.owner'],
      order: {
        createdAt: 'DESC',
      },
    });

    return readings.map((r) => ({
      ...r,
      ph: !r.ph || Number(r.ph) <= 1 ? 6.5 : Number(r.ph),
    }));
  }
}