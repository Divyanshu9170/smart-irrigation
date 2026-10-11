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

  // 🌾 GET ACTIVE CROP PROFILE & OPERATING MODE
  async getActiveCrop(deviceId: string = 'ESP32-0001') {
    let device = await this.deviceRepository.findOne({
      where: { deviceId },
      relations: ['crop'],
    });

    if (!device) {
      device = await this.deviceRepository.findOne({
        relations: ['crop'],
      });
    }

    if (!device) {
      // Find or seed default crop
      let defaultCrop = await this.cropRepository.findOne({ where: { name: 'Tomato' } });
      if (!defaultCrop) {
        defaultCrop = await this.cropRepository.findOne({});
      }
      return {
        deviceId,
        mode: 'AUTO',
        crop: defaultCrop,
        relays: this.getRelaysForDevice(deviceId),
      };
    }

    if (!device.crop) {
      const defaultCrop = await this.cropRepository.findOne({ where: { name: 'Tomato' } });
      if (defaultCrop) {
        device.crop = defaultCrop;
        await this.deviceRepository.save(device);
      }
    }

    return {
      deviceId: device.deviceId,
      mode: device.mode || 'AUTO',
      crop: device.crop,
      relays: this.getRelaysForDevice(device.deviceId),
    };
  }

  // 🌾 SET ACTIVE CROP PROFILE FOR FARM (Works with any of the 100+ crops!)
  async setActiveCrop(
    cropIdOrName: number | string,
    deviceId: string = 'ESP32-0001',
    thresholds?: any,
  ) {
    let crop: Crop | null = null;
    if (typeof cropIdOrName === 'number' || (!isNaN(Number(cropIdOrName)) && typeof cropIdOrName !== 'string')) {
      crop = await this.cropRepository.findOne({ where: { id: Number(cropIdOrName) } });
    }
    if (!crop && typeof cropIdOrName === 'string') {
      const trimmed = cropIdOrName.trim();
      crop = await this.cropRepository
        .createQueryBuilder('crop')
        .where('LOWER(crop.name) = LOWER(:name)', { name: trimmed })
        .getOne();
    }

    // If crop does not yet exist in the DB, create it dynamically from passed thresholds
    if (!crop) {
      const name = String(cropIdOrName).trim();
      let minTemp = 20, maxTemp = 30;
      let minPh = 6.0, maxPh = 7.0;
      let minMoisture = 55, maxMoisture = 75;
      let minNitrogen = 100, maxNitrogen = 140;
      let minPhosphorus = 60, maxPhosphorus = 90;
      let minPotassium = 80, maxPotassium = 120;

      if (thresholds) {
        if (thresholds.temp) {
          const m = String(thresholds.temp).match(/(\d+)[^0-9]+(\d+)/);
          if (m) { minTemp = Number(m[1]); maxTemp = Number(m[2]); }
        }
        if (thresholds.ph) {
          const m = String(thresholds.ph).match(/([\d\.]+)[^0-9\.]+([\d\.]+)/);
          if (m) { minPh = Number(m[1]); maxPh = Number(m[2]); }
        }
        if (thresholds.moisture) {
          const m = String(thresholds.moisture).match(/(\d+)[^0-9]+(\d+)/);
          if (m) { minMoisture = Number(m[1]); maxMoisture = Number(m[2]); }
        }
        if (thresholds.nitrogen) {
          const n = Number(String(thresholds.nitrogen).replace(/[^0-9]/g, ''));
          if (n > 0) { minNitrogen = n; maxNitrogen = Math.round(n * 1.3); }
        }
        if (thresholds.phosphorus) {
          const p = Number(String(thresholds.phosphorus).replace(/[^0-9]/g, ''));
          if (p > 0) { minPhosphorus = p; maxPhosphorus = Math.round(p * 1.3); }
        }
        if (thresholds.potassium) {
          const k = Number(String(thresholds.potassium).replace(/[^0-9]/g, ''));
          if (k > 0) { minPotassium = k; maxPotassium = Math.round(k * 1.3); }
        }
      }

      crop = this.cropRepository.create({
        name,
        minTemp,
        maxTemp,
        minPh,
        maxPh,
        minMoisture,
        maxMoisture,
        minNitrogen,
        maxNitrogen,
        minPhosphorus,
        maxPhosphorus,
        minPotassium,
        maxPotassium,
      });
      crop = await this.cropRepository.save(crop);
      console.log(`🌱 Created new Crop entity on the fly: ${name}`);
    }

    let device = await this.deviceRepository.findOne({
      where: { deviceId },
      relations: ['crop'],
    });

    if (!device) {
      device = await this.deviceRepository.findOne({
        relations: ['crop'],
      });
    }

    if (!device) {
      device = this.deviceRepository.create({
        deviceId,
        name: 'Smart Irrigation Node 1',
        location: 'Field Sector A',
        mode: 'AUTO',
        crop,
      });
    } else {
      device.crop = crop;
    }

    const savedDevice = await this.deviceRepository.save(device);

    await this.autoActionRepository.save({
      deviceId: savedDevice.id,
      action: `[SYSTEM] Active crop set to ${crop.name}. Agronomic thresholds loaded: Moisture(${crop.minMoisture}-${crop.maxMoisture}%), N(${crop.minNitrogen}), P(${crop.minPhosphorus}), K(${crop.minPotassium})`,
      createdAt: new Date(),
    });

    console.log(`🌾 Active Crop updated to: ${crop.name} for ${deviceId}`);
    return {
      ok: true,
      deviceId: savedDevice.deviceId,
      mode: savedDevice.mode,
      activeCrop: crop,
    };
  }

  // ⚙️ TOGGLE AUTO VS MANUAL MODE
  async setDeviceMode(mode: 'AUTO' | 'MANUAL', deviceId: string = 'ESP32-0001') {
    let device = await this.deviceRepository.findOne({
      where: { deviceId },
    });

    if (!device) {
      device = await this.deviceRepository.findOne({});
    }

    if (device) {
      device.mode = mode;
      await this.deviceRepository.save(device);
      await this.autoActionRepository.save({
        deviceId: device.id,
        action: `[SYSTEM] Operating mode changed to ${mode}`,
        createdAt: new Date(),
      });
    }

    console.log(`⚙️ Operating mode set to ${mode} for ${deviceId}`);
    return {
      ok: true,
      mode,
    };
  }

  // 🧠 AUTONOMOUS CROP THRESHOLD EVALUATION ENGINE
  async evaluateAutonomousCropRules(
    deviceId: string,
    readings: {
      temperature: number;
      humidity: number;
      soilMoisture: number;
      nitrogen: number;
      phosphorus: number;
      potassium: number;
      ph: number;
    },
  ): Promise<Record<string, 'ON' | 'OFF'>> {
    let device = await this.deviceRepository.findOne({
      where: { deviceId },
      relations: ['crop'],
    });

    if (!device) {
      device = await this.deviceRepository.findOne({
        relations: ['crop'],
      });
    }

    const current = this.getRelaysForDevice(deviceId);

    if (!device) {
      return current;
    }

    // If device is in MANUAL mode, skip automatic threshold overrides
    if (device.mode === 'MANUAL') {
      return current;
    }

    // Ensure crop profile exists
    if (!device.crop) {
      const defaultCrop = await this.cropRepository.findOne({
        where: { name: 'Tomato' },
      });
      if (defaultCrop) {
        device.crop = defaultCrop;
        await this.deviceRepository.save(device);
      } else {
        return current;
      }
    }

    const crop = device.crop;
    const actionsToLog: string[] = [];

    // 1. Water (Soil Moisture)
    const shutoffMoisture = crop.maxMoisture ? (crop.minMoisture + crop.maxMoisture) / 2 : crop.minMoisture + 5;
    if (readings.soilMoisture < crop.minMoisture) {
      if (current.water !== 'ON') {
        current.water = 'ON';
        device.pumpStatus = 'ON';
        actionsToLog.push(
          `[AUTO] Water Pump ON: Soil moisture ${readings.soilMoisture}% < min ${crop.minMoisture}% (${crop.name})`,
        );
      }
    } else if (readings.soilMoisture >= shutoffMoisture) {
      if (current.water !== 'OFF') {
        current.water = 'OFF';
        device.pumpStatus = 'OFF';
        actionsToLog.push(
          `[AUTO] Water Pump OFF: Soil moisture ${readings.soilMoisture}% reached target (${crop.name})`,
        );
      }
    }

    // 2. Nitrogen (N Line)
    if (readings.nitrogen < crop.minNitrogen) {
      if (current.nitrogen !== 'ON') {
        current.nitrogen = 'ON';
        actionsToLog.push(
          `[AUTO] Nitrogen Valve ON: N ${readings.nitrogen} mg/kg < min ${crop.minNitrogen} mg/kg (${crop.name})`,
        );
      }
    } else {
      if (current.nitrogen !== 'OFF') {
        current.nitrogen = 'OFF';
        actionsToLog.push(
          `[AUTO] Nitrogen Valve OFF: N level satisfied (${crop.name})`,
        );
      }
    }

    // 3. Phosphorus (P Line)
    if (readings.phosphorus < crop.minPhosphorus) {
      if (current.phosphorus !== 'ON') {
        current.phosphorus = 'ON';
        actionsToLog.push(
          `[AUTO] Phosphorus Valve ON: P ${readings.phosphorus} mg/kg < min ${crop.minPhosphorus} mg/kg (${crop.name})`,
        );
      }
    } else {
      if (current.phosphorus !== 'OFF') {
        current.phosphorus = 'OFF';
        actionsToLog.push(
          `[AUTO] Phosphorus Valve OFF: P level satisfied (${crop.name})`,
        );
      }
    }

    // 4. Potassium (K Line)
    if (readings.potassium < crop.minPotassium) {
      if (current.potassium !== 'ON') {
        current.potassium = 'ON';
        actionsToLog.push(
          `[AUTO] Potassium Valve ON: K ${readings.potassium} mg/kg < min ${crop.minPotassium} mg/kg (${crop.name})`,
        );
      }
    } else {
      if (current.potassium !== 'OFF') {
        current.potassium = 'OFF';
        actionsToLog.push(
          `[AUTO] Potassium Valve OFF: K level satisfied (${crop.name})`,
        );
      }
    }

    // 5. Fan (Cooling)
    if (readings.temperature > crop.maxTemp) {
      if (current.fan !== 'ON') {
        current.fan = 'ON';
        actionsToLog.push(
          `[AUTO] Exhaust Fan ON: Temp ${readings.temperature}°C > max ${crop.maxTemp}°C (${crop.name})`,
        );
      }
    } else {
      if (current.fan !== 'OFF') {
        current.fan = 'OFF';
        actionsToLog.push(
          `[AUTO] Exhaust Fan OFF: Temp stabilized (${crop.name})`,
        );
      }
    }

    // 6. Growth Bulb / Heater
    if (readings.temperature < crop.minTemp) {
      if (current.bulb !== 'ON') {
        current.bulb = 'ON';
        actionsToLog.push(
          `[AUTO] Growth Lamp ON: Temp ${readings.temperature}°C < min ${crop.minTemp}°C (${crop.name})`,
        );
      }
    } else {
      if (current.bulb !== 'OFF') {
        current.bulb = 'OFF';
        actionsToLog.push(
          `[AUTO] Growth Lamp OFF: Temp adequate (${crop.name})`,
        );
      }
    }

    // Log changes to AutoActions database table
    if (actionsToLog.length > 0) {
      await this.deviceRepository.save(device);
      for (const logText of actionsToLog) {
        await this.autoActionRepository.save({
          deviceId: device.id,
          action: logText,
          createdAt: new Date(),
        });
        console.log(`🤖 ${logText}`);
      }

      // Forward to physical ESP32 if IP registered
      const espIp = this.deviceIps[device.deviceId];
      if (espIp) {
        fetch(`http://${espIp}:80/relay-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(current),
          signal: AbortSignal.timeout(2000),
        }).catch(() => {});
      }
    }

    return current;
  }
}