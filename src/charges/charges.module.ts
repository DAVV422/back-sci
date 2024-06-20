import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChargeEntity } from './entities/charges.entity';
import { ChargeController } from './controllers/charge.controller';
import { ChargeService } from './services/charge.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChargeEntity]),
    UserModule  
  ],
  controllers: [ChargeController],
  providers: [ChargeService],
  exports: [TypeOrmModule, ChargeService]
})
export class ChargesModule {}
