import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Device } from './device.entity';
import { Crop } from '../crops/crop.entity';
import { User } from '../users/user.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,

    @InjectRepository(Crop)
    private cropRepository: Repository<Crop>,

    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // ✅ CREATE DEVICE
  // Feature 2: now requires a deviceId (e.g. "ESP32-0001") and an ownerId
  // linking the device to the farmer who registered it.
  async create(createDeviceDto: any): Promise<Device> {
    const crop = await this.cropRepository.findOne({
      where: { id: createDeviceDto.cropId },
    });

    if (!crop) {
      throw new NotFoundException('Crop not found');
    }

    const owner = await this.userRepository.findOne({
      where: { id: createDeviceDto.ownerId },
    });

    if (!owner) {
      throw new NotFoundException('Owner (user) not found');
    }

    const device = this.deviceRepository.create({
      deviceId: createDeviceDto.deviceId,
      name: createDeviceDto.name,
      location: createDeviceDto.location,
      crop: crop,
      owner: owner,
    });

    return this.deviceRepository.save(device);
  }

  // ✅ GET ALL DEVICES
  // ⚠️ Not user-scoped — kept as-is so nothing currently calling this
  // breaks. Route-level scoping is added in Feature 3.
  async findAll(): Promise<Device[]> {
    return this.deviceRepository.find();
  }

  // ✅ GET DEVICES FOR ONE USER (Feature 2 — used by the controller
  // once guards are wired up in Feature 3)
  async findAllForUser(userId: number): Promise<Device[]> {
    return this.deviceRepository.find({
      where: { owner: { id: userId } },
    });
  }

  // ✅ GET ONE DEVICE
  async findOne(id: number): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return device;
  }

  // ✅ DELETE DEVICE
  async remove(id: number): Promise<void> {
    const result = await this.deviceRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Device not found');
    }
  }
}