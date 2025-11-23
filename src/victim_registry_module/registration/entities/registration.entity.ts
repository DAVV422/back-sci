import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from './../../../common/entities/base.entity';
import { VictimEntity } from './../../victim/entities/victim.entity';
import { Form207Entity } from './../../form-207/entities/form-207.entity';

@Entity('registration')
export class RegistrationEntity extends BaseEntity{
    @Column({ name: 'classification', type: 'varchar', nullable: false })
    classification: string;

    @Column({ name: 'date', type: 'date', nullable: false })
    date: Date;

    @Column({ name: 'hour', type: 'varchar', nullable: false })
    hour: string;

    @Column({ name: 'place_of_transfer', type: 'varchar', nullable: true })
    place_of_transfer: string;

    @Column({ name: 'transfered_by', type: 'varchar', nullable: true })
    transfered_by: string;

    @Column({ name: 'cellphone_transfer_manager', type: 'varchar', nullable: true })
    cellphone_transfer_manager: string;

    @ManyToOne(() => VictimEntity, (victim) => victim.registrations, { nullable: false, onDelete: 'CASCADE' })
    victim: VictimEntity;

    @ManyToOne(() => Form207Entity, (form207) => form207.registrations, { nullable: false, onDelete: 'CASCADE' })
    form207: Form207Entity;
}
