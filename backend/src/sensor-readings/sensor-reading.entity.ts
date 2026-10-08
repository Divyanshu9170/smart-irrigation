import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Device } from '../devices/device.entity';

@Entity()
export class SensorReading {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('float')
  temperature: number;

  @Column('float')
  humidity: number;

  @Column('float')
  ph: number;

  @Column('float')
  soilMoisture: number;

  @Column('float')
  nitrogen: number;

  @Column('float')
  phosphorus: number;

  @Column('float')
  potassium: number;

  @ManyToOne(() => Device, (device) => device.readings, { eager: true })
  device: Device;

  // 🔥 ONLY ADD THIS (DO NOT CHANGE OTHER CODE)
  @CreateDateColumn()
  createdAt: Date;
}