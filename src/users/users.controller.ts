import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UserResponseDto,
} from './dto';
import { BaseResponseDto } from '../shared/dto/base-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return BaseResponseDto.success('User created successfully', user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all users (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll() {
    const users = await this.usersService.findAll();
    return BaseResponseDto.success('Users retrieved successfully', users);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req: { user: { userId: string } }) {
    const user = await this.usersService.findOne(req.user.userId);
    return BaseResponseDto.success(
      'Profile retrieved successfully',
      UserResponseDto.fromEntity(user),
    );
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @Request() req: { user: { userId: string } },
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(
      req.user.userId,
      updateProfileDto,
    );
    return BaseResponseDto.success('Profile updated successfully', user);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Request() req: { user: { userId: string } },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(req.user.userId, changePasswordDto);
    return BaseResponseDto.success('Password changed successfully', null);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return BaseResponseDto.success(
      'User retrieved successfully',
      UserResponseDto.fromEntity(user),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return BaseResponseDto.success('User updated successfully', user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }

  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  async deactivate(@Param('id') id: string) {
    const user = await this.usersService.deactivate(id);
    return BaseResponseDto.success('User deactivated successfully', user);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Activate user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activate(@Param('id') id: string) {
    const user = await this.usersService.activate(id);
    return BaseResponseDto.success('User activated successfully', user);
  }
}
