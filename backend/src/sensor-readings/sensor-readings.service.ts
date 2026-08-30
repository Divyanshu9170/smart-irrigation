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
    const device = await this.deviceRepo.findOne({
      where: {
        deviceId: dto.deviceId,
      },
    });

    if (!device) {
      throw new NotFoundException(
        `Device "${dto.deviceId}" not found`,
      );
    }

    // Create the sensor reading and attach the actual Device entity.
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

  // ============================================
  // GET ALL SENSOR READINGS
  // ============================================
  async findAll() {
    return this.sensorRepo.find({
      relations: ['device'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  // ============================================
  // GET SENSOR READINGS FOR ONE USER
  // ============================================
  async findAllForUser(userId: number) {
    return this.sensorRepo.find({
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
  }
}