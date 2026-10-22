import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ResourceEntity } from '../../resource/entities/resource.entity';
import { EquipmentCategory } from '../equipment-catalog';

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

  /** Categoría del inventario (extinción, rescate, APH, MATPEL, comunicaciones, EPP...). */
  @Column({ name: 'category', type: 'varchar', length: 30, default: 'otro' })
  category: EquipmentCategory;

  /** Sirve en cualquier emergencia (EPP, radios, botiquín): se sugiere siempre al despachar. */
  @Column({ name: 'general_use', type: 'boolean', default: false })
  generalUse: boolean;

  /** Tipos de emergencia en los que se usa (los mismos nombres que el tipo de la emergencia). */
  @Column({ name: 'emergency_types', type: 'text', array: true, default: () => "'{}'" })
  emergencyTypes: string[];

  @OneToMany(() => ResourceEntity, (resource) => resource.equipment)
  resources: ResourceEntity[];
}
