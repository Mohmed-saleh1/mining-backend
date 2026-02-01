import { PartialType } from '@nestjs/swagger';
import { CreateMiningMachineDto } from './create-mining-machine.dto';

export class UpdateMiningMachineDto extends PartialType(CreateMiningMachineDto) {}
