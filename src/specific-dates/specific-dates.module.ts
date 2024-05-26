import { Module } from '@nestjs/common';
import { SpecificDatesController } from './controllers/specific-dates.controller';
import { SpecificDatesService } from './services/specific-dates.service';

@Module({
  controllers: [SpecificDatesController],
  providers: [SpecificDatesService]
})
export class SpecificDatesModule {}
