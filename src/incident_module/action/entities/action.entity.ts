import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './../../../common/entities/base.entity';
import { EmergencyEntity } from './../../../organization_module/emergency/entities/emergency.entity';
import { UserEntity } from './../../../user/entities/user.entity';

@Entity({ name: 'action' })
export class ActionEntity extends BaseEntity {
  @Column({
    name: 'description',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  description: string;

  @Column({ name: 'date', type: 'date', nullable: false })
  date: Date;

  @Column({ name: 'hour', type: 'varchar', length: 10, nullable: false })
  hour: string;

  @ManyToOne(() => UserEntity, () => '', {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @ManyToOne(() => EmergencyEntity, (emergency) => emergency.actions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  emergency: EmergencyEntity;
}
