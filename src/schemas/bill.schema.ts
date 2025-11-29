import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, UpdateQuery } from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import { MaterialType, PaymentMode, PaymentStatus } from "src/common/enums";

@Schema()
export class BillItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: String, enum: MaterialType })
  type: MaterialType;

  @Prop({ required: true })
  weight: number;

  @Prop({ required: true })
  pricePerGram: number;

  @Prop({ required: true })
  makingCharge: number;
}

@Schema({ timestamps: true })
export class Bill {
  @Prop({
    type: String,
    default: uuidv4,
    unique: true,
    index: true,
  })
  uuid: string;
   @Prop({
    required: true,
    unique: true,
    default: () => `BILL-${Math.floor(100000 + Math.random() * 900000)}`,
  })
  billNumber: string;
  @Prop({ required: true, type: String }) customerId: string;
  @Prop({ type: [BillItem], required: true, minlength: 1 }) items: BillItem[];
  @Prop({ default: 0, min: 0, max: 100 }) tax: number;
  @Prop({ default: 0, min: 0, max: 9999999 }) taxAmount: number;
  @Prop({ default: 0, min: 0, max: 9999999 }) discount: number;
  @Prop({ default: false }) isDeleted: boolean;
  @Prop({ default: 0 }) subtotal: number;
  @Prop({ default: 0 }) total: number;
  @Prop({ default: 0 }) dueAmount: number;
  @Prop({ default: 0 }) totalPaid: number;
  @Prop({ enum: [...Object.values(PaymentMode), ''], type: String, default: '' }) paymentMode: string;
  @Prop({ enum: PaymentStatus, type: String, default: PaymentStatus.PENDING }) paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  customerName?: string;
  customerPhone?: string;
}

export type BillDocument = Bill & Document;
export const BillSchema = SchemaFactory.createForClass(Bill);

function getItemPrice(item: BillItem): number {
  const basic = item.pricePerGram * item.weight;
  const making = basic * (item.makingCharge / 100);
  return basic + making;
}

function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

BillSchema.pre('save', function (next) {
  if (!this.items || this.items.length === 0) {
    this.subtotal = 0;
    this.taxAmount = 0;
    this.total = 0;
    this.dueAmount = 0;
    this.totalPaid = this.totalPaid || 0;
    this.paymentMode = this.paymentMode || '';
    this.paymentStatus = this.paymentStatus || PaymentStatus.PENDING;
    return next();
  }
  const subtotal = this.items.reduce((acc, item) => acc + getItemPrice(item), 0);

  const taxable = subtotal - (this.discount || 0);
  const taxAmount = (taxable * (this.tax || 0)) / 100;
  const total = taxable + taxAmount;

  this.subtotal = round2(subtotal);
  this.taxAmount = round2(taxAmount);
  this.total = round2(total);
  this.dueAmount = total - (this.totalPaid || 0);
  this.paymentMode = this.paymentMode || '';
  this.paymentStatus = (this.totalPaid || 0) === 0 ? PaymentStatus.PENDING : this.dueAmount === 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL_PAID;

  next();
});

type BillItemPartial = {
  pricePerGram: number;
  weight: number;
  makingCharge: number;
  makingChargeAmount?: number;
  price?: number;
};

BillSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as UpdateQuery<Bill>|null;
  if (!update) return next();
  const typedItems = update.items as BillItemPartial[]|undefined;

  if (typedItems && Array.isArray(typedItems)) {
    typedItems.forEach((item) => {
      const makingChargeAmount = (item.pricePerGram * item.weight * item.makingCharge) / 100;
      const price = item.pricePerGram * item.weight + makingChargeAmount;
      item.makingChargeAmount = makingChargeAmount;
      item.price = price;
    });

    const subtotal = typedItems.reduce((acc, item) => acc + (item.price ?? 0), 0);
    const total = subtotal + (subtotal * (update.tax || 0)) / 100;

    update.subtotal = subtotal;
    update.total = total;
    const totalPaid = update.totalPaid ?? 0;
    update.dueAmount = total - totalPaid;
    update.paymentStatus = totalPaid === 0 ? PaymentStatus.PENDING : update.dueAmount === 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL_PAID;
    this.setUpdate(update);
  }

  next();
});
