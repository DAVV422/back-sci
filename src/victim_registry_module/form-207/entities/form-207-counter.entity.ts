import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'emergency_form207_counter' })
export class EmergencyForm207CounterEntity {
  @PrimaryColumn({ type: 'uuid', name: 'emergency_id' })
  emergencyId: string;

  @Column({ name: 'last_value', type: 'integer', default: 0 })
  lastValue: number;
}
