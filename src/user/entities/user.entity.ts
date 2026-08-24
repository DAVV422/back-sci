import { Column, Entity, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { ROLES } from '../../common/constants';
import { EmergencyEntity } from '../../organization_module/emergency/entities/emergency.entity';
import { AttendEntity } from '../../organization_module/attends/entities/attends.entity';
import { RefreshTokenEntity } from '../../auth/entities/refresh-token.entity';
import { AuthTokenEntity } from '../../auth/entities/auth-token.entity';
import { IUser } from '../interfaces/user.interface';

@Entity({ name: 'user' })
export class UserEntity extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: false })
  lastName: string;

  @Column({ name: 'password', type: 'varchar', length: 255, nullable: false })
  @Exclude()
  password: string;

  @Column({ name: 'cellphone', type: 'varchar', length: 20, nullable: true })
  cellphone?: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 100,
    nullable: false,
    unique: true,
  })
  email: string;

  @Column({ name: 'grade', type: 'varchar', length: 50, nullable: true })
  grade?: string;

  @Column({ name: 'birthdate', type: 'date', nullable: true })
  birthdate?: Date;

  @Column({ name: 'url_image', type: 'varchar', nullable: true })
  urlImage?: string;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @Column({
    name: 'role',
    type: 'enum',
    enum: ROLES,
    default: ROLES.BASIC,
  })
  role: ROLES;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @OneToMany(() => EmergencyEntity, (emergency) => emergency.user)
  emergencies: EmergencyEntity[];

  @OneToMany(() => AttendEntity, (attend) => attend.user)
  attends: AttendEntity[];

  @OneToMany(() => RefreshTokenEntity, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshTokenEntity[];

  @OneToMany(() => AuthTokenEntity, (authToken) => authToken.user)
  authTokens: AuthTokenEntity[];
}
