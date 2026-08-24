import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserEntity } from '../../user/entities/user.entity';

export enum AuthTokenType {
  ACTIVATION = 'ACTIVATION',
  PASSWORD_RECOVERY = 'PASSWORD_RECOVERY',
}

@Entity({ name: 'auth_token' })
export class AuthTokenEntity extends BaseEntity {
  @ManyToOne(() => UserEntity, (user) => user.authTokens, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @RelationId((authToken: AuthTokenEntity) => authToken.user)
  userId: string;

  @Column({
    name: 'token_hash',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  tokenHash: string;

  // Guardado como VARCHAR en base de datos (no enum nativo de DB)
  @Column({
    name: 'type',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  type: AuthTokenType;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: false })
  expiresAt: Date;

  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed: boolean;
}
