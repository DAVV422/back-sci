import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ResourceEntity } from "../../resource/entities/resource.entity";

@Entity({ name: 'equipment' })
export class EquipmentEntity extends BaseEntity {

    @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
    name: string;

    @Column({ name: 'description', type: 'text', nullable: true })
    description: string;

    @Column({ name: 'total_quantity', type: 'int', nullable: false })
    totalQuantity: number;

    @Column({ name: 'available_quantity', type: 'int', nullable: false })
    availableQuantity: number;

    @OneToMany(() => ResourceEntity, (resource) => resource.equipment)
    resources: ResourceEntity[];
}
