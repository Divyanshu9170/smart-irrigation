import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Device } from './device.entity';
import { Crop } from '../crops/crop.entity';
import { User } from '../users/user.entity';
import { AutoAction } from '../auto-actions/auto-action.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,

    @InjectRepository(Crop)
    private cropRepository: Repository<Crop>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(AutoAction)
    private autoActionRepository: Repository<AutoAction>,
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
    const userDevices = await this.deviceRepository.find({
      where: { owner: { id: userId } },
    });
    if (userDevices.length > 0) {
      return userDevices;
    }
    return this.deviceRepository.find();
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

  // 🔌 Feature 5 — MANUAL PUMP CONTROL
  // Verifies the device belongs to the requesting user, updates
  // pumpStatus, and logs the toggle as an AutoAction so it shows up
  // in the existing GET /auto-actions/:deviceId history.
  async setPumpStatus(
    id: number,
    status: 'ON' | 'OFF',
    userId: number,
  ): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.owner && device.owner.id !== userId) {
      throw new ForbiddenException('You do not own this device');
    }

    device.pumpStatus = status;
    const updated = await this.deviceRepository.save(device);

    await this.autoActionRepository.save({
      deviceId: device.id,
      action: `Pump turned ${status} (manual)`,
      createdAt: new Date(),
    });

    return updated;
  }

  // In-memory persistent state of all 6 relays per deviceId
  private deviceRelays: Record<string, Record<string, 'ON' | 'OFF'>> = {};
  private deviceIps: Record<string, string> = {};

  registerDeviceIp(deviceId: string, ip: string) {
    if (!ip) return;
    const cleanIp = ip.replace(/^.*:/, '').trim();
    if (cleanIp && cleanIp !== '127.0.0.1') {
      this.deviceIps[deviceId] = cleanIp;
      console.log(`📡 Registered IP for device ${deviceId}: ${cleanIp}`);
    }
  }

  getRelaysForDevice(deviceId: string): Record<string, 'ON' | 'OFF'> {
    if (!this.deviceRelays[deviceId]) {
      this.deviceRelays[deviceId] = {
        water: 'OFF',
        nitrogen: 'OFF',
        phosphorus: 'OFF',
        potassium: 'OFF',
        fan: 'OFF',
        bulb: 'OFF',
      };
    }
    return this.deviceRelays[deviceId];
  }

  async getRelayStatus(id: number, userId: number) {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.owner && device.owner.id !== userId) {
      throw new ForbiddenException('You do not own this device');
    }

    const current = this.getRelaysForDevice(device.deviceId);
    current.water = (device.pumpStatus as 'ON' | 'OFF') || current.water || 'OFF';
    return current;
  }

  async setRelay(
    id: number,
    relay:
      | 'water'
      | 'nitrogen'
      | 'phosphorus'
      | 'potassium'
      | 'fan'
      | 'bulb',
    status: 'ON' | 'OFF',
    userId: number,
  ) {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.owner && device.owner.id !== userId) {
      throw new ForbiddenException('You do not own this device');
    }

    const current = this.getRelaysForDevice(device.deviceId);
    current[relay] = status;

    if (relay === 'water') {
      device.pumpStatus = status;
      await this.deviceRepository.save(device);
    }

    await this.autoActionRepository.save({
      deviceId: device.id,
      action: `${relay.toUpperCase()} switched ${status} (manual)`,
      createdAt: new Date(),
    });

    // ⚡ Forward command immediately to physical ESP32 via HTTP POST
    const espIp = this.deviceIps[device.deviceId];
    if (espIp) {
      console.log(`⚡ Sending push command to physical ESP32 (http://${espIp}:80/relay) -> ${relay}: ${status}`);
      fetch(`http://${espIp}:80/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relay, status }),
        signal: AbortSignal.timeout(2000),
      })
        .then((res) => console.log(`✅ ESP32 hardware response: HTTP ${res.status}`))
        .catch((err) => {
          console.log(`⚠️ ESP32 direct push notice (${err.message}) - state will sync via telemetry response.`);
        });
    } else {
      console.log(`ℹ️ ESP32 IP not yet discovered for ${device.deviceId}. Command saved and will sync on next sensor post.`);
    }

    return current;
  }
}