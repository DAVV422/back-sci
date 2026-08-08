import { Module } from '@nestjs/common';

import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { UserModule } from '../user/user.module';
import { ChargesModule } from 'src/sci_module/charges/charges.module';

@Module({
  imports: [UserModule, ChargesModule],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeederModule {}
