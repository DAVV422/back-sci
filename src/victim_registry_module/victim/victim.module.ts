import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VictimService } from './services/victim.service';
import { VictimController } from './controllers/victim.controller';
import { VictimEntity } from './entities/victim.entity';

@Module({
    imports: [TypeOrmModule.forFeature([VictimEntity])],
    controllers: [VictimController],
    providers: [VictimService],
    exports: [VictimService],
})
export class VictimModule { }
