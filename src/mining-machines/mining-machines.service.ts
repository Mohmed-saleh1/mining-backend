import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiningMachine, MachineStatus } from './entities/mining-machine.entity';
import { CreateMiningMachineDto, UpdateMiningMachineDto } from './dto';

@Injectable()
export class MiningMachinesService {
  constructor(
    @InjectRepository(MiningMachine)
    private miningMachineRepository: Repository<MiningMachine>,
  ) {}

  async create(
    createMiningMachineDto: CreateMiningMachineDto,
  ): Promise<MiningMachine> {
    const machine = this.miningMachineRepository.create(createMiningMachineDto);
    return this.miningMachineRepository.save(machine);
  }

  async findAll(options?: {
    isActive?: boolean;
    isFeatured?: boolean;
    type?: string;
    status?: MachineStatus;
  }): Promise<MiningMachine[]> {
    const queryBuilder = this.miningMachineRepository
      .createQueryBuilder('machine')
      .orderBy('machine.sortOrder', 'ASC')
      .addOrderBy('machine.createdAt', 'DESC');

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('machine.isActive = :isActive', {
        isActive: options.isActive,
      });
    }

    if (options?.isFeatured !== undefined) {
      queryBuilder.andWhere('machine.isFeatured = :isFeatured', {
        isFeatured: options.isFeatured,
      });
    }

    if (options?.type) {
      queryBuilder.andWhere('machine.type = :type', { type: options.type });
    }

    if (options?.status) {
      queryBuilder.andWhere('machine.status = :status', {
        status: options.status,
      });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<MiningMachine> {
    const machine = await this.miningMachineRepository.findOne({
      where: { id },
    });

    if (!machine) {
      throw new NotFoundException({
        message: 'Mining machine not found',
        errorCode: 'MACHINE_001',
        errorDescription: `Mining machine with ID ${id} does not exist`,
      });
    }

    return machine;
  }

  async update(
    id: string,
    updateMiningMachineDto: UpdateMiningMachineDto,
  ): Promise<MiningMachine> {
    const machine = await this.findOne(id);

    // Check if trying to reduce total units below rented units
    if (
      updateMiningMachineDto.totalUnits !== undefined &&
      updateMiningMachineDto.totalUnits < machine.rentedUnits
    ) {
      throw new BadRequestException({
        message: 'Cannot reduce total units below rented units',
        errorCode: 'MACHINE_002',
        errorDescription: `There are ${machine.rentedUnits} units currently rented. Cannot set total units to ${updateMiningMachineDto.totalUnits}`,
      });
    }

    Object.assign(machine, updateMiningMachineDto);
    return this.miningMachineRepository.save(machine);
  }

  async remove(id: string): Promise<void> {
    const machine = await this.findOne(id);

    // Don't allow deletion if there are rented units
    if (machine.rentedUnits > 0) {
      throw new BadRequestException({
        message: 'Cannot delete machine with active rentals',
        errorCode: 'MACHINE_003',
        errorDescription: `There are ${machine.rentedUnits} units currently rented. Please wait for rentals to complete before deleting.`,
      });
    }

    await this.miningMachineRepository.remove(machine);
  }

  async toggleActive(id: string): Promise<MiningMachine> {
    const machine = await this.findOne(id);
    machine.isActive = !machine.isActive;
    return this.miningMachineRepository.save(machine);
  }

  async toggleFeatured(id: string): Promise<MiningMachine> {
    const machine = await this.findOne(id);
    machine.isFeatured = !machine.isFeatured;
    return this.miningMachineRepository.save(machine);
  }

  async updateStatus(id: string, status: MachineStatus): Promise<MiningMachine> {
    const machine = await this.findOne(id);
    machine.status = status;
    return this.miningMachineRepository.save(machine);
  }

  // Get public machines (for users to browse)
  async getPublicMachines(): Promise<MiningMachine[]> {
    return this.findAll({
      isActive: true,
      status: MachineStatus.AVAILABLE,
    });
  }

  // Get featured machines
  async getFeaturedMachines(): Promise<MiningMachine[]> {
    return this.findAll({
      isActive: true,
      isFeatured: true,
    });
  }
}
