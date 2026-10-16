import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EmergencyEntity } from '../../emergency/entities/emergency.entity';

export const ORGANIZATION_CHANGE_TYPES = ['assigned', 'released', 'charge_changed', 'removed'] as const;
export type OrganizationChangeType = (typeof ORGANIZATION_CHANGE_TYPES)[number];

/**
 * Casilla 14 del SCI-201: "graficar las estructuras y mantenerlas en forma secuencial (cada cambio
 * de estructura queda registrado)". Cada fila es un cambio en una asignación (`attend`).
 *
 * La escribe un trigger de la base sobre `attend` (migración OrganizationHistory), así queda el
 * registro venga el cambio de la web, del traspaso de mando o de la sincronización móvil. Guarda
 * el nombre de la persona y del cargo tal como eran en ese momento. Solo lectura para la API.
 */
@Entity({ name: 'organization_change' })
@Index('idx_organization_change_emergency', ['emergency', 'occurredAt'])
export class OrganizationChangeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EmergencyEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'emergency_id' })
  emergency: EmergencyEntity;

  @Column({ name: 'attend_id', type: 'uuid' })
  attendId: string;

  @Column({ name: 'change_type', type: 'varchar', length: 20 })
  changeType: OrganizationChangeType;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'user_name', type: 'varchar', length: 201 })
  userName: string;

  @Column({ name: 'charge_id', type: 'uuid' })
  chargeId: string;

  @Column({ name: 'charge_name', type: 'varchar', length: 100 })
  chargeName: string;

  @Column({ name: 'charge_level', type: 'int' })
  chargeLevel: number;

  /** Cargo anterior, solo en `charge_changed`. */
  @Column({ name: 'previous_charge_name', type: 'varchar', length: 100, nullable: true })
  previousChargeName?: string | null;

  /** Cuándo ocurrió: la hora de la asignación en un alta, el momento del cambio en lo demás. */
  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
