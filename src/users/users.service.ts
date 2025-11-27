import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from 'src/schemas/user.schema';
import { CreateUserDto } from 'src/dtos/user.dto';
import { paginate, PaginationOptions, PaginationResult } from 'src/common/interface/pagination.interface';
import { UserType } from 'src/common/interface/user.interface';
import { parseMongooseError } from 'src/common/mongoose-error.util';
import { CommonUtils } from 'src/common/common.utils';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly config: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserType> {
    try {
      const { email, mobile, password } = createUserDto;
      if(email && email.trim() !== ''){
        const existing = await this.userModel.findOne({ email: createUserDto.email }).lean().exec();
        if (existing) {
          throw new BadRequestException('User with this email already exists');
        }
      }
      if(mobile && mobile.trim() !== ''){
        const existing = await this.userModel.findOne({ mobile: createUserDto.mobile }).lean().exec();
        if (existing) {
          throw new BadRequestException('User with this mobile already exists');
        }
      }
      
      let hashedPassword: string | undefined;
      if (password && password.trim() !== '') {
        const saltRounds = Number(this.config.get('SALT_ROUNDS')) || 10;
        hashedPassword = await bcrypt.hash(password, saltRounds);
      }

      const createdUser = new this.userModel({
        ...createUserDto,
        ...(hashedPassword && { password: hashedPassword }),
      });

      return await createdUser.save();
    } catch (error) {
      // if (error instanceof BadRequestException) throw error;
      const parsedError = parseMongooseError(error);
      throw new Error(parsedError.message);
    }
  }

  async findByEmail(email: string, isDeleted = true): Promise<UserType | null> {
    try {
      return await this.userModel.findOne({ email, isDeleted }).lean().exec();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to fetch user by email');
    }
  }

  async findDocumentByEmail(email: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findOne({ email }).exec();
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  async findById(id: string): Promise<UserType> {
    try {
      const user = await this.userModel.findOne({uuid: id, isDeleted: false}).lean().exec();
      if (!user) throw new NotFoundException('User not found');
      return user;
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }
  
  async findByUuids(ids: string[]): Promise<UserType[]> {
    try {
      const users = await this.userModel.find({uuid: {$in: ids}, isDeleted: false}).lean<UserType[]>().exec();
      return users;
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  async update(id: string, reqPayload: Partial<CreateUserDto>): Promise<UserType> {
    try {
      const updated = await this.userModel
        .findOneAndUpdate(
          { uuid: id, isDeleted: false },
          { $set: reqPayload },
          { new: true }
        )
        .lean()
        .exec();

      if (!updated) throw new NotFoundException('User not found');
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async findAll(options: PaginationOptions<User>): Promise<PaginationResult<UserType>> {
    try {
      return await paginate(this.userModel, {
        ...options,
        query: { ...options.query, isDeleted: false },
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async remove(id: string): Promise<UserType> {
    try {
      const deleted = await this.userModel.findOneAndUpdate({uuid: id, isDeleted: false}, {$set: {isDeleted: true} }, { new: true }).lean().exec();

      if (!deleted) throw new NotFoundException('User not found');
      return deleted;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
