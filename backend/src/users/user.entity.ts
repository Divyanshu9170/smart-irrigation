import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  // 🔒 Stored as a bcrypt hash — never the plain password
  @Column()
  password: string;

  @CreateDateColumn()
  createdAt: Date;
}
