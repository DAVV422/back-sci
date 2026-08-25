import { Module, forwardRef } from '@nestjs/common';

import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { UserModule } from '../user/user.module';
import { ChargesModule } from '../sci_module/charges/charges.module';

@Module({
  imports: [forwardRef(() => UserModule), forwardRef(() => ChargesModule)],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeederModule {}
