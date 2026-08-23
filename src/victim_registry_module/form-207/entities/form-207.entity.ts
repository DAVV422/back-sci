import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EmergencyEntity } from '../../../organization_module/emergency/entities/emergency.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { RegistrationEntity } from '../../registration/entities/registration.entity';

@Entity({ name: 'form207' })
export class Form207Entity extends BaseEntity {
  @Column({ name: 'code', type: 'varchar', length: 15, nullable: false })
  code: string;

  @Column({ name: 'place_of_registration', type: 'varchar', length: 255, nullable: false })
  placeOfRegistration: string;

  @Column({ name: 'attendant', type: 'varchar', length: 150, nullable: false })
  attendant: string;

  @Column({ name: 'date', type: 'date', nullable: false })
  date: Date;

  @Column({ name: 'is_finalized', type: 'boolean', default: false })
  isFinalized: boolean;

  @Column({
    name: 'client_generated_id',
    type: 'uuid',
    unique: true,
    nullable: true,
  })
  clientGeneratedId?: string;

  @ManyToOne(() => EmergencyEntity, (emergency) => emergency.form207, {
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

  @OneToMany(() => RegistrationEntity, (registration) => registration.form207)
  registrations: RegistrationEntity[];
}
