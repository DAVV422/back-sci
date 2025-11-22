import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './../../../common/entities/base.entity';
import { RegistrationEntity } from './../../registration/entities/registration.entity';

@Entity('victim')
export class VictimEntity extends BaseEntity{
    @Column({ name: 'name', type: 'varchar', nullable: false })
    name: string;

    @Column({ name: 'last_name', type: 'varchar', nullable: false })
    last_name: string;

    @Column({ name: 'gender', type: 'char', length: 1, nullable: false })
    gender: string;

    @Column({ name: 'age', type: 'int', nullable: false })
    age: number;

    @Column({ name: 'cellphone', type: 'varchar', nullable: true })
    cellphone: string;

    @Column({ name: 'reference_cellphone', type: 'varchar', nullable: true })
    reference_cellphone: string;

    @OneToMany(() => RegistrationEntity, (registration) => registration.victim)
    registrations: RegistrationEntity[];
}
