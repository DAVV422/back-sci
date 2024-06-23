import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { AttendEntity } from "../../attends/entities/attends.entity";
import { ActionEntity } from "../../action/entities/action.entity";
import { EmergencyEntity } from "../../emergency/entities/emergency.entity";

@Entity({ name: 'form201' })
export class Form201Entity extends BaseEntity{

    @Column({ name: 'objective', type: 'varchar', length: 255, nullable: false, default: '' })
    objective: string;

    @Column({ name: 'strategy', type: 'varchar', length: 255, nullable: false, default: '' })
    strategy: string;

    @Column({ name: 'safety_message', type: 'varchar', length: 255, nullable: false, default: '' })
    safety_message: string;

    @Column({ name: 'url_organization_chart', type: 'varchar', length: 255, default: '' })
    url_organization_chart: string;

    @Column({ name: 'thread', type: 'varchar', length: 255, default: '' })
    thread: string;

    @Column({ name: 'isolation', type: 'varchar', length: 255, default: '' })
    isolation: string;

    @Column({ name: 'affected_areas', type: 'varchar', length: 255, default: '' })
    affected_areas: string;

    @Column({ name: 'tactics', type: 'varchar', length: 255, nullable: false, default: '' })
    tactics: string;

    @Column({ name: 'egress_route', type: 'varchar', length: 255, default: '' })
    egress_route: string;

    @Column({ name: 'entry_route', type: 'varchar', length: 255, default: '' })
    entry_route: string;

    @Column({ name: 'affected_areas_m', type: 'varchar', length: 255, default: '' })
    affected_areasM: string;

    @Column({ name: 'date', type: 'date', nullable: false })
    date: Date;

    @OneToMany(() => ActionEntity, (action) => action.form201)
    actions: ActionEntity[];

    @ManyToOne(() => EmergencyEntity, emergency => emergency.form201, { nullable: false, onDelete: 'CASCADE' })
    emergency: EmergencyEntity;
}
