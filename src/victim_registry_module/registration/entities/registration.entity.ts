import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VictimEntity } from './../../victim/entities/victim.entity';
import { Form207Entity } from './../../form-207/entities/form-207.entity';
import { UserEntity } from '../../../user/entities/user.entity';

@Entity('registration')
export class RegistrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['rojo', 'amarillo', 'verde', 'negro'],
    nullable: false,
  })
  classification: 'rojo' | 'amarillo' | 'verde' | 'negro';

  @Column({ name: 'transferred_by', type: 'varchar', length: 150, nullable: true })
  transferredBy?: string;

  @Column({
    name: 'cellphone_transfer_manager',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  cellphoneTransferManager?: string;

  @Column({ name: 'notes', type: 'varchar', length: 500, nullable: true })
  notes?: string;

  @Column({ name: 'date', type: 'date', nullable: false })
  date: Date;

  @Column({ name: 'hour', type: 'varchar', length: 10, nullable: false })
  hour: string;

  @Column({
    name: 'client_generated_id',
    type: 'uuid',
    unique: true,
    nullable: true,
  })
  clientGeneratedId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => VictimEntity, (victim) => victim.registrations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'victim_id' })
  victim: VictimEntity;

  @ManyToOne(() => Form207Entity, (form207) => form207.registrations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'form207_id' })
  form207: Form207Entity;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
