import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VictimService } from './services/victim.service';
import { VictimController } from './controllers/victim.controller';
import { VictimEntity } from './entities/victim.entity';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VictimEntity]),
    UserModule,
  ],
  controllers: [VictimController],
  providers: [VictimService],
  exports: [VictimService, TypeOrmModule],
})
export class VictimModule {}
