import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { EmergencyEntity } from '../../emergency/entities/emergency.entity';
import { ChargeEntity } from 'src/sci_module/charges/entities/charges.entity';

@Entity({ name: 'attend' })
export class AttendEntity extends BaseEntity {
  @Column({ name: 'date', type: 'date', nullable: false })
  date: Date;

  @Column({ name: 'hour', type: 'time', nullable: false })
  hour: string;

  @ManyToOne(() => UserEntity, (user) => user.attends, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @ManyToOne(() => EmergencyEntity, (emergency) => emergency.attends, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  emergency: EmergencyEntity;

  @ManyToOne(() => ChargeEntity, (charge) => charge.attends, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  charge: ChargeEntity;
}
