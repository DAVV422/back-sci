import { Column, Entity, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EmergencyEntity } from './emergency.entity';

@Entity({ name: 'initial_assessment' })
export class InitialAssessmentEntity extends BaseEntity {
  @Column({
    name: 'hazard_type',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  hazard_type: string;

  @Column({
    name: 'nature_of_incident',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  nature_of_incident?: string;

  @Column({ name: 'threats', type: 'text', nullable: true })
  threats?: string;

  @Column({
    name: 'affected_area',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  affected_area?: string;

  @Column({ name: 'isolation', type: 'varchar', length: 100, nullable: true })
  isolation?: string;

  @Column({
    name: 'severity_level',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  severity_level?: string;

  @Column({
    name: 'affected_people_estimated',
    type: 'int',
    nullable: true,
  })
  affected_people_estimated?: number;

  @Column({ name: 'situation_description', type: 'text', nullable: true })
  situation_description?: string;

  @Column({
    name: 'weather_conditions',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  weather_conditions?: string;

  @OneToOne(() => EmergencyEntity, (emergency) => emergency.initialAssessment)
  emergency: EmergencyEntity;
}
