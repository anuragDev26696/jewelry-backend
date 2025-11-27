import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from 'src/common/decorators/roles.decorator';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class User {
  @Prop({
    type: String,
    default: uuidv4,
    unique: true,
    index: true,
  })
  uuid: string;
  @Prop({ required: true }) name: string;
  @Prop({ unique: true }) email: string;
  @Prop() password: string;
  @Prop({ enum: Role, default: 'Customer' }) role: Role;
  @Prop({ unique: true, maxlength: 10, minLength: 10}) mobile: string;
  @Prop({maxlength: 100}) address: string;
  @Prop() imageUrl: string;
  @Prop({default: false}) isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);