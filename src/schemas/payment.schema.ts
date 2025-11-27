import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PaymentMode } from 'src/common/enums';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class Payment {
  @Prop({
    type: String,
    default: uuidv4,
    unique: true,
    index: true,
  })
  uuid: string;

  @Prop({ required: true })
  billId: string;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ enum: [...Object.values(PaymentMode)], type: String, required: true })
  paymentMode: PaymentMode;

  @Prop({ default: '' })
  note?: string;

  @Prop({ default: false }) isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentDocument = Payment & Document;
export const PaymentSchema = SchemaFactory.createForClass(Payment);
