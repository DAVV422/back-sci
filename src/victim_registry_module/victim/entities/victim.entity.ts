import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RegistrationEntity } from '../../registration/entities/registration.entity';

@Entity('victim')
export class VictimEntity extends BaseEntity {
  @Column({ name: 'identifier', type: 'varchar', length: 50, nullable: true })
  identifier?: string;

  @Column({ name: 'age_estimated', type: 'int', nullable: true })
  ageEstimated?: number;

  @Column({ name: 'gender', type: 'varchar', length: 20, nullable: true })
  gender?: string;

  @Column({ name: 'cellphone', type: 'varchar', length: 20, nullable: true })
  cellphone?: string;

  @Column({ name: 'reference_cellphone', type: 'varchar', length: 20, nullable: true })
  referenceCellphone?: string;

  @Column({
    name: 'client_generated_id',
    type: 'uuid',
    unique: true,
    nullable: true,
  })
  clientGeneratedId?: string;

  @OneToMany(() => RegistrationEntity, (registration) => registration.victim)
  registrations: RegistrationEntity[];
}
