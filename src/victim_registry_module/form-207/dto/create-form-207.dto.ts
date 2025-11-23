import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, IsOptional, IsDate, IsUUID } from 'class-validator';

export class CreateForm207Dto {
    @ApiProperty({
        description: 'Place of registration',
        example: 'Main Entrance',
    })
    @IsString()
    @IsOptional()
    place_of_registration: string;

    @ApiProperty({
        description: 'Attendant name',
        example: 'Jane Doe',
    })
    @IsString()
    @IsNotEmpty()
    attendant: string;

    @ApiProperty({
        description: 'Date of the form',
        example: '2023-10-27T10:00:00Z',
    })
    @IsDate()
    @IsNotEmpty()
    date: Date;

    @ApiProperty({
        example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
        type: String,
        description: 'Id de la emergencia a la que pertencerá',
    })
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    emergency: string;
}
