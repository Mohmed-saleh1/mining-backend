import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiningMachinesService } from './mining-machines.service';
import { MiningMachinesController } from './mining-machines.controller';
import { MiningMachine } from './entities/mining-machine.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MiningMachine])],
  controllers: [MiningMachinesController],
  providers: [MiningMachinesService],
  exports: [MiningMachinesService],
})
export class MiningMachinesModule {}
