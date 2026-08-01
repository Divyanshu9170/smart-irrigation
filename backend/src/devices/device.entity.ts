import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';

import { SensorReading } from '../sensor-readings/sensor-reading.entity';
import { Crop } from '../crops/crop.entity';
import { User } from '../users/user.entity';

@Entity()
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  // 🔗 Human-facing unique hardware ID, e.g. "ESP32-0001".
  // Separate from the numeric `id` PK — this is what the ESP32
  // firmware will send, and what farmers see in the UI.
  @Column({ unique: true })
  deviceId: string;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column({ default: 'AUTO' })
  mode: string;

  // 🔗 Device belongs to one crop
  @ManyToOne(() => Crop, { eager: true })
  crop: Crop;

  // 🔗 Device belongs to one farmer (Feature 2 — device ownership).
  // NOT eager — eager-loading would leak the full User object
  // (including the hashed password) in every device API response.
  @ManyToOne(() => User)
  owner: User;

  // 🔗 Device has many sensor readings
  @OneToMany(() => SensorReading, (reading) => reading.device)
  readings: SensorReading[];
}
