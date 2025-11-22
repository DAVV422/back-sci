import { Column, Entity, OneToMany } from 'typeorm';
import { RegistrationEntity } from './../../registration/entities/registration.entity';
import { BaseEntity } from './../../../common/entities/base.entity';

@Entity('form_207')
export class Form207Entity extends BaseEntity {
    @Column({ name: 'place_of_registration', type: 'varchar', nullable: false })
    place_of_registration: string;

    @Column({ name: 'attendant', type: 'varchar', nullable: false })
    attendant: string;

    @Column({ name: 'date', type: 'timestamp', nullable: false })
    date: Date;

    @OneToMany(() => RegistrationEntity, (registration) => registration.victim)
    registrations: RegistrationEntity[];
}
