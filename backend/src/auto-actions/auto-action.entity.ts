import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class AutoAction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  deviceId: number;

  @Column({ type: 'text' })
  action: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}