import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Device } from '../devices/device.entity';

@Entity()
export class SensorReading {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  temperature: number;

  @Column()
  humidity: number;

  @Column('float')
  ph: number;

  @Column()
  soilMoisture: number;

  @Column()
  nitrogen: number;

  @Column()
  phosphorus: number;

  @Column()
  potassium: number;

  @ManyToOne(() => Device, (device) => device.readings, { eager: true })
  device: Device;

  // 🔥 ONLY ADD THIS (DO NOT CHANGE OTHER CODE)
  @CreateDateColumn()
  createdAt: Date;
}