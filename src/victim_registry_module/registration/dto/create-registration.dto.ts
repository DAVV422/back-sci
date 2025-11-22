import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class CreateRegistrationDto {
    @ApiProperty({
        description: 'Classification of the registration',
        example: 'Urgent',
    })
    @IsString()
    @IsNotEmpty()
    classification: string;

    @ApiProperty({
        description: 'Date of the registration',
        example: '2023-10-27',
    })
    @IsDateString()
    @IsNotEmpty()
    date: Date;

    @ApiProperty({
        description: 'Hour of the registration',
        example: '14:30',
    })
    @IsString()
    @IsNotEmpty()
    hour: string;

    @ApiProperty({
        description: 'Place of transfer',
        example: 'Hospital Central',
    })
    @IsString()
    @IsNotEmpty()
    place_of_transfer: string;

    @ApiProperty({
        description: 'Person who transferred',
        example: 'Paramedic John',
    })
    @IsString()
    @IsNotEmpty()
    transfered_by: string;

    @ApiProperty({
        description: 'Cellphone of the transfer manager',
        example: '+1234567890',
    })
    @IsString()
    @IsNotEmpty()
    cellphone_transfer_manager: string;
}
