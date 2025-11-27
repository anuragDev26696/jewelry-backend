import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, UpdateQuery } from "mongoose";
import { MaterialType } from "src/common/enums";
import { CreateBillDto } from "src/dtos/bill.dto";
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class Item {
  @Prop({
    type: String,
    default: uuidv4,
    unique: true,
    index: true,
  })
  uuid: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true, type: String, enum: MaterialType }) type: MaterialType;
  @Prop({max: 1000000, min: 0}) weight: number;
  @Prop({max: 1000000, min: 0}) pricePerGram: number;
  @Prop({max: 100, min: 0}) makingCharge: number;
  @Prop({max: 100, min: 0}) tax: number;
  @Prop({default: false}) isDeleted: boolean;
  @Prop({ required: false, default: 0 }) makingChargeAmount: number;
  @Prop({ required: false, default: 0 }) price: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ItemDocument = Item & Document;
export const ItemSchema = SchemaFactory.createForClass(Item);

ItemSchema.pre<Item>('save', function (next) {
  const basePrice = (this.weight || 0) * (this.pricePerGram || 0);
  this.makingChargeAmount = (basePrice * (this.makingCharge || 0)) / 100;
  this.price = basePrice + (this.makingChargeAmount || 0);
  next();
});

ItemSchema.pre(['findOneAndUpdate', 'updateOne'], function (next) {
  const update: UpdateQuery<CreateBillDto>|null = this.getUpdate();

  if (!update) return next();

  const weight = update.weight ?? this.get('weight') ?? 0;
  const rate = update.pricePerGram ?? this.get('pricePerGram') ?? 0;
  const mcPercent = update.makingCharge ?? this.get('makingCharge') ?? 0;

  const makingChargeAmount = (rate * weight * mcPercent) / 100;
  const price = rate * weight + makingChargeAmount;

  update.makingChargeAmount = makingChargeAmount;
  update.price = price;

  this.setUpdate(update);
  next();
});
