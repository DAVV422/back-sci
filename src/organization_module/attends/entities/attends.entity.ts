import { Column, Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { UserEntity } from "../../user/entities/user.entity";
import { Form201Entity } from "../../form-201/entities/form-201.entity";
import { EmergencyEntity } from "../../emergency/entities/emergency.entity";
import { ChargeEntity } from "../../charges/entities/charges.entity";

@Entity({ name: 'attend' })
export class AttendEntity extends BaseEntity {

    @Column({ name: 'date', type: 'date', nullable: false })
    date: Date;

    @ManyToOne(() => UserEntity, user => user.attends, { nullable: false, onDelete: 'CASCADE' })
    user: UserEntity;

    @ManyToOne(() => EmergencyEntity, emergency => emergency.attends, { nullable: false, onDelete: 'CASCADE' })
    emergency: EmergencyEntity;

    @ManyToOne(() => ChargeEntity, charge => charge.attends, { nullable: false, onDelete: 'CASCADE' })
    charge: ChargeEntity;
}
