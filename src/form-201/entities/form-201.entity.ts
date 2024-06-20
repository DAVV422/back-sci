import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { AttendEntity } from "../../attends/entities/attends.entity";
// import { ActionEntity } from "../../actions/entities/action.entity";
import { EmergencyEntity } from "../../emergency/entities/emergency.entity";

@Entity({ name: 'form201' })
export class Form201Entity extends BaseEntity{

    @Column({ name: 'objective', type: 'varchar', length: 255, nullable: false })
    objective: string;

    @Column({ name: 'strategy', type: 'varchar', length: 255, nullable: false })
    strategy: string;

    @Column({ name: 'safety_message', type: 'varchar', length: 255, nullable: false })
    safety_message: string;

    @Column({ name: 'url_organization_chart', type: 'varchar', length: 255, default: '' })
    url_organization_chart: string;

    @Column({ name: 'thread', type: 'varchar', length: 255, default: '' })
    thread: string;

    @Column({ name: 'isolation', type: 'varchar', length: 255, default: '' })
    isolation: string;

    @Column({ name: 'affected_areas', type: 'varchar', length: 255, default: '' })
    affected_areas: string;

    @Column({ name: 'tactics', type: 'varchar', length: 255, nullable: false })
    tactics: string;

    @Column({ 
        name: 'coordinates_pc', 
        type: 'simple-array', 
        nullable: true, 
        comment: 'Array with longitude and latitude'
    })
    coordinates_pc?: number[];

    @Column({ 
        name: 'coordinates_e', 
        type: 'simple-array', 
        nullable: true, 
        comment: 'Array with longitude and latitude'
    })
    coordinates_e?: number[];

    @Column({ name: 'egress_route', type: 'varchar', length: 255, default: '' })
    egress_route: string;

    @Column({ name: 'entry_route', type: 'varchar', length: 255, default: '' })
    entry_route: string;

    @Column({ name: 'affected_areas_m', type: 'varchar', length: 255, default: '' })
    affected_areasM: string;

    @Column({ name: 'date', type: 'date', nullable: false })
    date: Date;

    // @OneToMany(() => ActionEntity, action => action.form201)
    // actions: ActionEntity[];

    @ManyToOne(() => EmergencyEntity, emergency => emergency.form201, { nullable: false, onDelete: 'CASCADE' })
    emergency: EmergencyEntity;
}
