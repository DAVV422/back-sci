import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { VictimEntity } from './../../victim/entities/victim.entity';
import { Form207Entity } from './../../form-207/entities/form-207.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { HealthFacilityEntity } from '../../health-facility/entities/health-facility.entity';

/** Casilla 8 del SCI-207, "Trasladado por": el medio de transporte (manual SCI). */
export const TRANSPORT_MEANS = ['ambulancia', 'aereo', 'embarcacion', 'otro'] as const;
export type TransportMeans = (typeof TRANSPORT_MEANS)[number];

@Entity('registration')
@Index('idx_registration_occurred_at', ['occurredAt'])
export class RegistrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['rojo', 'amarillo', 'verde', 'negro'],
    nullable: false,
  })
  classification: 'rojo' | 'amarillo' | 'verde' | 'negro';

  /** Unidad o vehículo concreto (p. ej. "Ambulancia SAMU 12"). Complementa `transportMeans`. */
  @Column({ name: 'transferred_by', type: 'varchar', length: 150, nullable: true })
  transferredBy?: string;

  /** Casilla 8: medio de traslado. Va siempre junto con `transferDestination` (ambos o ninguno). */
  @Column({ name: 'transport_means', type: 'enum', enum: TRANSPORT_MEANS, nullable: true })
  transportMeans?: TransportMeans | null;

  /** Casilla 7: lugar de traslado. */
  @ManyToOne(() => HealthFacilityEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transfer_destination_id' })
  transferDestination?: HealthFacilityEntity | null;

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

  /**
   * Instante (UTC) de la evaluación de triage, derivado de `date` + `hour` por un trigger de la base
   * (migración TimestampsWithTimeZone). Solo lectura: sirve para filtrar y ordenar por rango.
   */
  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true, insert: false, update: false })
  occurredAt?: Date | null;

  @Column({
    name: 'client_generated_id',
    type: 'uuid',
    unique: true,
    nullable: true,
  })
  clientGeneratedId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
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
