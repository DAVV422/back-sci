import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AttendEntity } from '../../attends/entities/attends.entity';

@Entity({ name: 'charge' })
export class ChargeEntity extends BaseEntity {
  
  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  name: string;
  
  @Column({ name: 'level', type: 'int', nullable: false })
  level: number;
  
  @Column({ name: 'weight', type: 'decimal', precision: 5, scale: 2, nullable: false })
  weight: number;
  
  @OneToMany(() => AttendEntity, (attend) => attend.charge)
  attends: AttendEntity[];
}
