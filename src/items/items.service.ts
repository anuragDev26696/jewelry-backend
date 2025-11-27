import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ItemType } from 'src/common/interface/item.interface';
import { paginate, PaginationOptions, PaginationResult } from 'src/common/interface/pagination.interface';
import { CreateItemDto } from 'src/dtos/item.dto';
import { Item, ItemDocument } from 'src/schemas/items.schema';

@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(Item.name) private readonly itemModel: Model<ItemDocument>,
  ) {}

  async create(createItemDto: CreateItemDto): Promise<ItemType> {
    try {
      const trimmedName = createItemDto.name.trim();
      const existing = await this.itemModel.findOne({
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
        isDeleted: false,
      }).lean().exec();

      if (existing) {
        throw new BadRequestException('Item with this name already exists');
      }

      const created = await this.itemModel.create({
        ...createItemDto,
        name: trimmedName,
      });

      return created.toObject();
    } catch (error) {
      console.error('Error in create method:', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to create item');
    }
  }

  async findById(uuid: string): Promise<ItemType> {
    try {
      const user = await this.itemModel.findOne({uuid, isDeleted: false}).exec();
      if (!user || user.isDeleted)
        throw new NotFoundException('Item not found');
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch item');
    }
  }

  async findAll(options: PaginationOptions<Item>): Promise<PaginationResult<ItemType>> {
    try {
      return await paginate(this.itemModel, {
        ...options,
        query: { ...options.query, isDeleted: false },
      });

    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to fetch items');
    }
  }

  async remove(id: string): Promise<ItemType> {
    try {
      const deleted = await this.itemModel.findOneAndUpdate({uuid: id, isDeleted: false}, {$set: {isDeleted: true} }, { new: true }).exec();
      if (!deleted) throw new NotFoundException('Item not found');
      return deleted;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to delete item');
    }
  }
}
