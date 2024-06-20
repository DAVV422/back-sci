import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { ResourceEntity } from "../../resource/entities/resource.entity";

@Entity({ name: 'equipment' })
export class EquipmentEntity extends BaseEntity {

    @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
    name: string;

    @Column({ name: 'utilization', type: 'varchar', length: 255, nullable: false })
    utilization: string;

    @Column({ name: 'description', type: 'text', nullable: true })
    description: string;

    @Column({ name: 'acquisition_date', type: 'date', nullable: false })
    acquisitionDate: Date;

    @Column({ name: 'state_acquisition', type: 'varchar', length: 50, nullable: false })
    stateAcquisition: string;

    @Column({ name: 'state_actual', type: 'varchar', length: 50, nullable: false })
    stateActual: string;

    @Column({ name: 'url_photo', type: 'varchar', length: 255, nullable: true })
    urlPhoto: string;

    @OneToMany(() => ResourceEntity, (resource) => resource.equipment)
    resources: ResourceEntity[];
}
