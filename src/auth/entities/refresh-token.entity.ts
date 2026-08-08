import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity';
import { UserEntity } from '../../user/entities/user.entity';

@Entity({ name: 'refresh_token' })
export class RefreshTokenEntity extends BaseEntity {
  @ManyToOne(() => UserEntity, (user) => user.refreshTokens, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @RelationId((refreshToken: RefreshTokenEntity) => refreshToken.user)
  userId: string;

  @Column({
    name: 'token_hash',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  tokenHash: string;

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked: boolean;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: false })
  expiresAt: Date;
}
