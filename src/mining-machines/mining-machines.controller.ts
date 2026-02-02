import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MiningMachinesService } from './mining-machines.service';
import { CreateMiningMachineDto, UpdateMiningMachineDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MachineStatus } from './entities/mining-machine.entity';
import { BaseResponseDto } from '../shared/dto/base-response.dto';

@ApiTags('Mining Machines')
@Controller('mining-machines')
export class MiningMachinesController {
  constructor(private readonly miningMachinesService: MiningMachinesService) {}

  // ============ PUBLIC ENDPOINTS ============

  @Get('public')
  @ApiOperation({ summary: 'Get all public available mining machines' })
  @ApiResponse({
    status: 200,
    description: 'Returns all active and available mining machines',
  })
  async getPublicMachines() {
    const machines = await this.miningMachinesService.getPublicMachines();
    return BaseResponseDto.success('Public mining machines retrieved successfully', machines);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured mining machines' })
  @ApiResponse({
    status: 200,
    description: 'Returns all featured mining machines',
  })
  async getFeaturedMachines() {
    const machines = await this.miningMachinesService.getFeaturedMachines();
    return BaseResponseDto.success('Featured mining machines retrieved successfully', machines);
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Get a specific mining machine by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the mining machine details',
  })
  @ApiResponse({ status: 404, description: 'Mining machine not found' })
  async findOnePublic(@Param('id', ParseUUIDPipe) id: string) {
    const machine = await this.miningMachinesService.findOne(id);
    return BaseResponseDto.success('Mining machine retrieved successfully', machine);
  }

  // ============ ADMIN ENDPOINTS ============

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new mining machine (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Mining machine created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async create(@Body() createMiningMachineDto: CreateMiningMachineDto) {
    const machine = await this.miningMachinesService.create(createMiningMachineDto);
    return BaseResponseDto.success('Mining machine created successfully', machine);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all mining machines (Admin only)' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, enum: ['asic', 'gpu'] })
  @ApiQuery({ name: 'status', required: false, enum: MachineStatus })
  @ApiResponse({
    status: 200,
    description: 'Returns all mining machines',
  })
 async findAll(
    @Query('isActive') isActive?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('type') type?: string,
    @Query('status') status?: MachineStatus,
  ) {
    const options: {
      isActive?: boolean;
      isFeatured?: boolean;
      type?: string;
      status?: MachineStatus;
    } = {};

    if (isActive !== undefined) {
      options.isActive = isActive === 'true';
    }
    if (isFeatured !== undefined) {
      options.isFeatured = isFeatured === 'true';
    }
    if (type) {
      options.type = type;
    }
    if (status) {
      options.status = status;
    }

    const machines = await this.miningMachinesService.findAll(options);
    return BaseResponseDto.success('Mining machines retrieved successfully', machines);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a mining machine by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the mining machine',
  })
  @ApiResponse({ status: 404, description: 'Mining machine not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.miningMachinesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a mining machine (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Mining machine updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Mining machine not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMiningMachineDto: UpdateMiningMachineDto,
  ) {
    return this.miningMachinesService.update(id, updateMiningMachineDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a mining machine (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Mining machine deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Mining machine not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete machine with active rentals',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.miningMachinesService.remove(id);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle machine active status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Machine active status toggled',
  })
  toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.miningMachinesService.toggleActive(id);
  }

  @Patch(':id/toggle-featured')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle machine featured status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Machine featured status toggled',
  })
  toggleFeatured(@Param('id', ParseUUIDPipe) id: string) {
    return this.miningMachinesService.toggleFeatured(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update machine status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Machine status updated',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: MachineStatus,
  ) {
    return this.miningMachinesService.updateStatus(id, status);
  }
}
