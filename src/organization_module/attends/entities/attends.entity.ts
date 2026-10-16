import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { EmergencyEntity } from '../../emergency/entities/emergency.entity';
import { ChargeEntity } from 'src/sci_module/charges/entities/charges.entity';

@Entity({ name: 'attend' })
@Index('idx_attend_occurred_at', ['occurredAt'])
@Index('uq_attend_incident_commander_active', ['emergency'], {
  unique: true,
  where: `charge_system_name = 'incident_commander' AND is_active = true`,
})
export class AttendEntity extends BaseEntity {
  @Column({ name: 'date', type: 'date', nullable: false })
  date: Date;

  @Column({ name: 'hour', type: 'time', nullable: false })
  hour: string;

  /**
   * Instante (UTC) de la asignación, derivado de `date` + `hour` por un trigger de la base
   * (migración TimestampsWithTimeZone). Solo lectura: sirve para filtrar y ordenar por rango.
   */
  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true, insert: false, update: false })
  occurredAt?: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'charge_system_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  chargeSystemName?: string;

  @ManyToOne(() => UserEntity, (user) => user.attends, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @ManyToOne(() => EmergencyEntity, (emergency) => emergency.attends, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  emergency: EmergencyEntity;

  @ManyToOne(() => ChargeEntity, (charge) => charge.attends, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  charge: ChargeEntity;
}
