import { MaterialType } from "../enums";

export interface ItemType extends BillItem {
  // price: number;
  // makingChargeAmount: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  uuid?: string;
}

export interface BillItem {
  name: string;
  weight: number;
  pricePerGram: number;
  makingCharge: number;
  type: MaterialType;
};