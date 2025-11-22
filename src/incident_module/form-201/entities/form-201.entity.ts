import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { EmergencyEntity } from "../../../organization_module/emergency/entities/emergency.entity";

@Entity({ name: 'form201' })
export class Form201Entity extends BaseEntity {

    @Column({ name: 'objective', type: 'varchar', length: 255, nullable: true, default: '' })
    //Objectivo de la emergencia
    objective: string;

    @Column({ name: 'strategy', type: 'varchar', nullable: true, default: '' })
    //Estrategias definidas para la emergencia
    strategy: string;

    @Column({ name: 'safety_message', type: 'varchar', nullable: true, default: '' })
    //Mensaje de seguridad para la emergencia
    safety_message: string;

    @Column({ name: 'url_organization_chart', type: 'varchar', nullable: true, default: '' })
    //URL del organigrama de la emergencia
    url_organization_chart: string;

    @Column({ name: 'nature', type: 'varchar', nullable: true, default: '' })
    //Naturaleza de la emergencia
    nature: string;

    @Column({ name: 'thread', type: 'varchar', nullable: true, default: '' })
    //Amenazas en la emergencia
    thread: string;

    @Column({ name: 'isolation', type: 'varchar', nullable: true, default: '' })
    //Area de aislamiento en la emergencia
    isolation: string;

    @Column({ name: 'affected_areas', type: 'varchar', nullable: true, length: 255, default: '' })
    //Areas afectadas de la emergencia
    affected_areas: string;

    @Column({ name: 'tactics', type: 'varchar', length: 255, nullable: true, default: '' })
    //Tacticas definidas para la emergencia
    tactics: string;

    @Column({ name: 'communications_channel', type: 'varchar', nullable: true, length: 255, default: '' })
    //Ruta de salida definida para la emergencia
    communications_channel: string;

    @Column({ name: 'egress_route', type: 'varchar', nullable: true, length: 255, default: '' })
    //Ruta de salida definida para la emergencia
    egress_route: string;

    @Column({ name: 'entry_route', type: 'varchar', nullable: true, length: 255, default: '' })
    //Ruta de entrada definida para la emergencia
    entry_route: string;

    @Column({ name: 'affected_areas_map_url', type: 'varchar', nullable: true, length: 255, default: '' })
    //URL del mapa con las areas afectadas de la emergencia
    affected_areas_map_url: string;

    @Column({ name: 'date', type: 'date', nullable: false })
    //Fecha de la emergencia
    date: Date;

    @ManyToOne(() => EmergencyEntity, emergency => emergency.form201, { nullable: false, onDelete: 'CASCADE' })
    emergency: EmergencyEntity;
}
