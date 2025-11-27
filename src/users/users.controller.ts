import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from 'src/dtos/user.dto';
import { CommonUtils } from 'src/common/common.utils';
import { UserType } from 'src/common/interface/user.interface';
import { SearchRequestDTO } from 'src/dtos/search.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      return await this.usersService.create(createUserDto);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.usersService.findAll({ query: {} });
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Post('/search')
  async search(@Body() searchQuery: SearchRequestDTO) {
    try {
      let query = {};
      if(searchQuery.keyword) {
        const keywordRegex = new RegExp(searchQuery.keyword.trim(), 'i');
        query = { $or: [ { name: { $regex: keywordRegex } }, { email: { $regex: keywordRegex } }, { mobile: { $regex: keywordRegex } } ] };
      }
      return await this.usersService.findAll({ query, ...searchQuery });
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserType> {
    try {
      const user = await this.usersService.findById(id);
      return user;
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Put(':id')
  async updateOne(@Param('id') id: string, @Body() reqPayload: Partial<CreateUserDto>) {
    try {
      if(Object.keys(reqPayload).length === 0) {
        throw CommonUtils.formatError(new Error('No data provided for update'));
      }
      if(id.trim() === '') {
        throw CommonUtils.formatError(new Error('Invalid user ID'));
      }
      return await this.usersService.update(id, reqPayload);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.usersService.remove(id);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }
}
