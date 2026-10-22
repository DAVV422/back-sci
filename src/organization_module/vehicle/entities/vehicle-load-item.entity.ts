import { Column, CreateDateColumn, Entity, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { EquipmentEntity } from '../../equipment/entities/equipment.entity';
import { VehicleEntity } from './vehicle.entity';

/**
 * Una línea de la carga estándar de un vehículo: qué equipo y cuántas unidades lleva a bordo.
 * Esas unidades son parte del inventario (`equipment.total_quantity`); se pueden despachar con el
 * vehículo o sueltas.
 */
@Entity({ name: 'vehicle_load_item' })
@Index('uq_vehicle_load_item', ['vehicle', 'equipment'], { unique: true })
export class VehicleLoadItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => VehicleEntity, (vehicle) => vehicle.load, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: VehicleEntity;

  @ManyToOne(() => EquipmentEntity, { nullable: false, onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment: EquipmentEntity;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
