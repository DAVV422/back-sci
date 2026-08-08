import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EmergencyEntity } from '../../../organization_module/emergency/entities/emergency.entity';
import { UserEntity } from '../../../user/entities/user.entity';

@Entity({ name: 'form201' })
@Index('uq_form201_active_per_emergency', ['emergency'], {
  unique: true,
  where: 'is_deleted = false',
})
export class Form201Entity extends BaseEntity {
  @Column({ name: 'code', type: 'varchar', length: 15, nullable: false })
  code: string;

  @Column({ name: 'date', type: 'date', nullable: false })
  date: Date;

  @Column({ name: 'nature', type: 'varchar', length: 150, nullable: false })
  nature: string;

  @Column({ name: 'thread', type: 'text', nullable: false })
  thread: string;

  @Column({ name: 'affected_area', type: 'varchar', length: 255, nullable: false })
  affectedArea: string;

  @Column({
    name: 'communications_channel',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  communicationsChannel: string;

  @Column({ name: 'entry_route', type: 'varchar', length: 255, nullable: false })
  entryRoute: string;

  @Column({ name: 'egress_route', type: 'varchar', length: 255, nullable: false })
  egressRoute: string;

  @Column({
    name: 'affected_areas_map_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  affectedAreasMapUrl?: string;

  @Column({ name: 'objectives', type: 'text', nullable: false })
  objectives: string;

  @Column({ name: 'strategies', type: 'text', nullable: false })
  strategies: string;

  @Column({ name: 'tactics', type: 'text', nullable: false })
  tactics: string;

  @Column({ name: 'safety_message', type: 'varchar', length: 500, nullable: false })
  safetyMessage: string;

  @Column({ name: 'organization_chart', type: 'jsonb', nullable: false })
  organizationChart: Record<string, any>;

  @Column({ name: 'is_finalized', type: 'boolean', default: false })
  isFinalized: boolean;

  @Column({
    name: 'client_generated_id',
    type: 'uuid',
    unique: true,
    nullable: true,
  })
  clientGeneratedId?: string;

  @ManyToOne(() => EmergencyEntity, (emergency) => emergency.form201, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'emergency_id' })
  emergency: EmergencyEntity;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
