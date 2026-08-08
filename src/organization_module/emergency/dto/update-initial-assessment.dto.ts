import { PartialType } from '@nestjs/mapped-types';

import { CreateInitialAssessmentDto } from './create-initial-assessment.dto';

export class UpdateInitialAssessmentDto extends PartialType(
  CreateInitialAssessmentDto,
) {}
