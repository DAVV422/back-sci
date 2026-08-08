import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { SeedService } from './seed.service';

@ApiTags('Seeder')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get('/all')
  public async runSeeder(): Promise<any> {
    return await this.seedService.runAllSeeders();
  }

  @Get('/charges')
  public async runSeederCharges(): Promise<any> {
    return await this.seedService.runSeedersCharges();
  }
}
