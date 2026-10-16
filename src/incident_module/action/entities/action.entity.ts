import { Column, Entity, JoinColumn, ManyToOne, OneToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EmergencyEntity } from '../../../organization_module/emergency/entities/emergency.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { AudioEntity } from './audio.entity';

@Entity({ name: 'action' })
@Index('idx_action_occurred_at', ['occurredAt'])
export class ActionEntity extends BaseEntity {
  @Column({
    name: 'description',
    type: 'varchar',
    length: 500,
    nullable: false,
  })
  description: string;

  @Column({ name: 'date', type: 'date', nullable: false })
  date: Date;

  @Column({ name: 'hour', type: 'varchar', length: 10, nullable: false })
  hour: string;

  /**
   * Instante (UTC) de la acción, derivado de `date` + `hour` por un trigger de la base
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

  @ManyToOne(() => UserEntity, () => '', {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => EmergencyEntity, (emergency) => emergency.actions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'emergency_id' })
  emergency: EmergencyEntity;

  @OneToOne(() => AudioEntity, (audio) => audio.action, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: 'audio_id' })
  audio?: AudioEntity;
}
