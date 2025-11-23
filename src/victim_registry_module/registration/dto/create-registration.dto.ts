import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsDate } from 'class-validator';

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
    @IsDate()
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

    @ApiProperty({
        example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
        type: String,
        description: 'Id de la victima a la que pertencerá',
    })
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    victim: string;

    @ApiProperty({
        example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
        type: String,
        description: 'Id del formulario 207 a la que pertencerá',
    })
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    form207: string;
}
