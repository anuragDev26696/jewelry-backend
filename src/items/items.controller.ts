import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CommonUtils } from 'src/common/common.utils';
import { ItemsService } from './items.service';
import { CreateItemDto } from 'src/dtos/item.dto';
import { SearchRequestDTO } from 'src/dtos/search.dto';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemService: ItemsService) {}

  @Post('')
  async create(@Body() itemReq: CreateItemDto) {
    try {
      const result = await this.itemService.create(itemReq);
      return result;
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.itemService.findAll({ query: {} });
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.itemService.findById(id);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Put(':id')
  async updateOne(@Param('id') id: string, @Body() itemReq: CreateItemDto) {
    try {
      return await this.itemService.update(id, itemReq);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Post('/search')
  async search(@Body() searchReq: SearchRequestDTO) {
    try {
      let query = {};
      if(searchReq.keyword) {
        query = {
          name: { $regex: new RegExp(searchReq.keyword, 'i') },
        };
      }
      const result = await this.itemService.findAll({query, ...searchReq});
      return result;
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.itemService.remove(id);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }
}
