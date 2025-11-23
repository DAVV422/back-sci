import { Column, Entity, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { RegistrationEntity } from './../../registration/entities/registration.entity';
import { BaseEntity } from './../../../common/entities/base.entity';
import { EmergencyEntity } from 'src/organization_module/emergency/entities/emergency.entity';

@Entity('form207')
export class Form207Entity extends BaseEntity {
    @Column({ name: 'place_of_registration', type: 'varchar', nullable: false })
    place_of_registration: string;

    @Column({ name: 'attendant', type: 'varchar', nullable: false })
    attendant: string;

    @Column({ name: 'date', type: 'timestamp', nullable: false })
    date: Date;

    @OneToMany(() => RegistrationEntity, (registration) => registration.victim)
    registrations: RegistrationEntity[];

    @ManyToOne(() => EmergencyEntity, (emergency) => emergency.form207)
    emergency: EmergencyEntity;
}
