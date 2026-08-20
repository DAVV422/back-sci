import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserEntity } from '../../user/entities/user.entity';

@Entity('device_token')
export class DeviceTokenEntity extends BaseEntity {
  @Column({ name: 'token', type: 'varchar', length: 255, unique: true, nullable: false })
  token: string;

  @Column({ name: 'device_os', type: 'varchar', length: 20, default: 'android' })
  deviceOs: string;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
