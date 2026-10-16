import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { Form201Entity } from '../../../incident_module/form-201/entities/form-201.entity';
import { AttendEntity } from '../../attends/entities/attends.entity';
import { ResourceEntity } from '../../resource/entities/resource.entity';
import { ActionEntity } from '../../../incident_module/action/entities/action.entity';
import { Form207Entity } from '../../../victim_registry_module/form-207/entities/form-207.entity';
import { EmergencyStatus } from '../enums/emergency-status.enum';
import { InitialAssessmentEntity } from './initial-assessment.entity';
import { DEFAULT_APP_TIMEZONE } from '../../../config/timezone';

@Entity({ name: 'emergency' })
@Index('idx_emergency_occurred_at', ['occurredAt'])
export class EmergencyEntity extends BaseEntity {
  @Column({
    name: 'code',
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: false,
  })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({
    name: 'location_description',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  location_description?: string;

  @Column({ name: 'date', type: 'varchar', nullable: false })
  date: Date;

  @Column({ name: 'hour', type: 'varchar', nullable: false })
  hour: string;

  /**
   * Instante (UTC) de el inicio de la emergencia, derivado de `date` + `hour` por un trigger de la base
   * (migración TimestampsWithTimeZone). Solo lectura: sirve para filtrar y ordenar por rango.
   */
  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true, insert: false, update: false })
  occurredAt?: Date | null;

  @Column({ name: 'type', type: 'varchar', length: 50, nullable: false })
  type: string;

  @Column({
    name: 'coordinates',
    type: 'simple-array',
    nullable: true,
    comment: 'Array with latitude and longitude',
  })
  coordinates?: number[];

  @Column({
    name: 'coordinates_pc',
    type: 'simple-array',
    nullable: true,
    comment: 'Array with longitude and latitude',
  })
  coordinates_pc?: number[];

  @Column({
    name: 'coordinates_e',
    type: 'simple-array',
    nullable: true,
    comment: 'Array with longitude and latitude',
  })
  coordinates_e?: number[];

  @Column({ name: 'state', type: 'varchar', length: 1, default: 'p' })
  state: EmergencyStatus;

  @Column({ name: 'duration', type: 'varchar', length: 50, default: '' })
  duration: string;

  /**
   * Zona horaria IANA con la que se registró la emergencia (la de la institución en ese momento).
   * `date`/`hour` y todos los timestamps se guardan en UTC; esta zona se usa para mostrarlos y
   * agruparlos en reportes, aunque la configuración de la institución cambie después.
   */
  @Column({ name: 'timezone', type: 'varchar', length: 64, default: DEFAULT_APP_TIMEZONE })
  timezone: string;

  @OneToOne(() => InitialAssessmentEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'initial_assessment_id' })
  initialAssessment?: InitialAssessmentEntity;

  @OneToMany(() => Form201Entity, (form201) => form201.emergency, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  form201?: Form201Entity[];

  @ManyToOne(() => UserEntity, (user) => user.emergencies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @OneToMany(() => AttendEntity, (attend) => attend.emergency, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  attends?: AttendEntity[];

  @OneToMany(() => ActionEntity, (action) => action.emergency)
  actions: ActionEntity[];

  @OneToMany(() => ResourceEntity, (resource) => resource.emergency)
  resources?: ResourceEntity[];

  @OneToMany(() => Form207Entity, (form207) => form207.emergency)
  form207: Form207Entity[];

  // @OneToMany(() => ImageEntity, image => image.emergency)
  // images: ImageEntity[];
}
