import { Entity } from 'typeorm';
import { Column } from 'typeorm/decorator/columns/Column';
import { Exclude } from 'class-transformer';

import { BaseEntity } from '../../common/entities/base.entity';
import { ROLES } from '../../common/constants';
import { IUser } from '../interfaces/user.interface';

@Entity({ name: 'user' })
export class UserEntity extends BaseEntity implements IUser {
  @Column()
  name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  cellphone: string;

  @Column({ nullable: true })
  grade: string;

  @Column({ nullable: true })
  birthdate: Date;

  @Column({ type: 'text', nullable: true })
  profile_url?: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ type: 'enum', enum: ROLES, default:ROLES.BASIC })
  role: ROLES;
}
