import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "./../../../common/entities/base.entity";
import { EmergencyEntity } from "./emergency.entity";

@Entity({ name: 'data_fires' })
export class DataFireEntity extends BaseEntity {
    @Column({ name: 'temperature', type: 'float', nullable: true })
    temperature?: number;

    @Column({ name: 'relative_humidity', type: 'float', nullable: true })
    relative_humidity?: number;

    @Column({ name: 'wind_speed', type: 'float', nullable: true })
    wind_speed?: number;

    @Column({ name: 'cause', type: 'varchar', nullable: true })
    cause?: string;

    @OneToOne(() => EmergencyEntity, emergency => "", { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'emergency_id' })
    emergency: EmergencyEntity;
}
