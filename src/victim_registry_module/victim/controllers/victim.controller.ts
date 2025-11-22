import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VictimService } from '../services/victim.service';
import { CreateVictimDto } from '../dto/create-victim.dto';
import { UpdateVictimDto } from '../dto/update-victim.dto';
import { VictimEntity } from '../entities/victim.entity';

@ApiTags('Victim')
@Controller('victim')
export class VictimController {
    constructor(private readonly victimService: VictimService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new victim' })
    @ApiResponse({ status: 201, description: 'The victim has been successfully created.', type: VictimEntity })
    create(@Body() createVictimDto: CreateVictimDto) {
        return this.victimService.create(createVictimDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all victims' })
    @ApiResponse({ status: 200, description: 'Return all victims.', type: [VictimEntity] })
    findAll() {
        return this.victimService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a victim by ID' })
    @ApiResponse({ status: 200, description: 'Return the victim.', type: VictimEntity })
    @ApiResponse({ status: 404, description: 'Victim not found.' })
    findOne(@Param('id') id: string) {
        return this.victimService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a victim' })
    @ApiResponse({ status: 200, description: 'The victim has been successfully updated.', type: VictimEntity })
    @ApiResponse({ status: 404, description: 'Victim not found.' })
    update(@Param('id') id: string, @Body() updateVictimDto: UpdateVictimDto) {
        return this.victimService.update(id, updateVictimDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a victim' })
    @ApiResponse({ status: 200, description: 'The victim has been successfully deleted.' })
    @ApiResponse({ status: 404, description: 'Victim not found.' })
    remove(@Param('id') id: string) {
        return this.victimService.remove(id);
    }
}
