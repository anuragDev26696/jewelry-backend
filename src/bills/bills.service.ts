import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { paginate, PaginationOptions, PaginationResult } from 'src/common/interface/pagination.interface';
import { CreateBillDto } from 'src/dtos/bill.dto';
import { Bill, BillDocument } from 'src/schemas/bill.schema';
import { UsersService } from 'src/users/users.service';
import * as Handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';
import { BillType, UpdateBillPayment } from 'src/common/interface/bill.interface';
import { User } from 'src/schemas/user.schema';
import * as path from 'path';
import * as fs from 'fs';
import { Buffer } from 'buffer';
import { CommonUtils } from 'src/common/common.utils';

@Injectable()
export class BillsService {
  constructor(
    @InjectModel(Bill.name) private readonly billModel: Model<BillDocument>,
    private readonly userService: UsersService,
  ) {}

  async create(billReq: CreateBillDto): Promise<BillType | null> {
    try {
      const user = await this.userService.findById(billReq.customerId);
      if(!user) {
        throw new BadRequestException('Invalid user');
      }
      
      const created = await this.billModel.create({
        ...billReq,
        isDeleted: false,
      });

      return {
        ...created.toObject(),
        customerName: user.name,
        customerPhone: user.mobile || '',
      };
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  async findById(id: string): Promise<BillType> {
    try {
      const bill = await this.billModel.findOne({uuid: id}).lean<BillType>().exec();
      if (!bill)
        throw new NotFoundException('Item bill found');
      
      const user = await this.userService.findById(bill.customerId);
      if(!user) {
        throw new BadRequestException('Invalid user');
      }
      
      return {
        ...bill,
        customerName: user.name,
        customerPhone: user.mobile,
      };
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  async findAll(options: PaginationOptions<Bill>): Promise<PaginationResult<BillType>> {
    try {
      const result = await paginate(this.billModel, {
        ...options,
        query: { ...options.query, isDeleted: false },
      });
      const customerIds = result.data.map((b: BillType) => b.customerId);
      const users = await this.userService.findByUuids(customerIds);
      const userMap = new Map(users.map((u: User) => [u.uuid, u]));
      result.data = result.data.map((bill: BillType) => ({
        ...bill,
        customerName: userMap.get(bill.customerId) ? userMap.get(bill.customerId)?.name : '',
        customerPhone: userMap.get(bill.customerId) ? userMap.get(bill.customerId)?.mobile : '',
      })) as BillType[];

      return result;
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  async remove(id: string): Promise<Bill> {
    try {
      const deleted = await this.billModel.findOneAndUpdate({uuid: id}, { isDeleted: true }, { new: true }).exec();
      if (!deleted) throw new NotFoundException('Bill not found');
      return deleted;
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  async updateBillPayment(billId: string, update: UpdateBillPayment): Promise<BillDocument | null> {
    return this.billModel.findOneAndUpdate(
      { uuid: billId },
      {
        $set: {
          totalPaid: update.totalPaid,
          dueAmount: update.dueAmount,
          paymentStatus: update.paymentStatus,
          paymentMode: update.paymentMode,
        },
      },
      { new: true },
    ).exec();
  }

  // async generateInvoicePdf(billId: string): Promise<Buffer> {
  //   const bill = await this.findById(billId);
  //   if (!bill) throw new NotFoundException('Bill not found');

  //   // PDF Setup
  //   const doc = new PDFDocument({ margin: 10 });
  //   const chunks: Buffer[] = [];

  //   const logoPath = path.resolve(__dirname, '../../assets/Swarn_abhushan.png');
  //   // const logoPath = path.resolve(process.cwd(), 'assets/logo.png');
  //   if (!fs.existsSync(logoPath)) {
  //     throw new InternalServerErrorException('Logo file not found in /assets/logo.png');
  //   }

  //   return new Promise<Buffer>((resolve, reject) => {
  //     doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  //     doc.on('end', () => resolve(Buffer.concat(chunks)));
  //     doc.on('error', reject);

  //     // HEADER
  //     doc.image(logoPath, 450, 30, { width: 60 });

  //     doc
  //       .fontSize(22)
  //       .fillColor('#d62828')
  //       .text('SWARN ABHUSHAN', 40, 30);

  //     doc
  //       .fontSize(10)
  //       .fillColor('black')
  //       .text('Naigarhi, Mauganj, Madhya Pradesh - 486341', 40, 60)
  //       .text('Phone: +91 94249 81420 | Email: contact@swarnjeweller.in')
  //       .text('GSTIN: 09ABCDE1234F1Z6')
  //       .moveDown(1.2);

  //     // INVOICE BOX
  //     const boxTop = doc.y;
  //     doc
  //       .rect(40, boxTop, 520, 70)
  //       .stroke('#fcbf49')
  //       .fillOpacity(0.05)
  //       .fill('#fff8e1').roundedRect(0,0,5,5)
  //       .fillOpacity(1);

  //     doc
  //       .fontSize(12)
  //       .fillColor('black')
  //       .text(`Invoice No: ${bill.billNumber}`, 50, boxTop + 10)
  //       .text(`Date: ${new Date(bill.createdAt).toLocaleDateString()}`, 50, boxTop + 28)
  //       .text(`Billed By: SWARN ABHUSHAN`, 350, boxTop + 10);

  //     // Customer
  //     doc
  //       .moveDown(2)
  //       .fontSize(11)
  //       .text(`Customer Name: ${bill.customerName}`)
  //       .text(`Phone: ${bill.customerPhone}`)
  //       .moveDown(1);

  //     // TABLE HEADER
  //     const cols = [50, 200, 280, 360, 430];
  //     doc.fontSize(11).fillColor('black');
  //     doc.text('Item', cols[0]);
  //     doc.text('Weight (g)', cols[1]);
  //     doc.text('Rate/g (₹)', cols[2]);
  //     doc.text('Making %', cols[3]);
  //     doc.text('Total (₹)', cols[4]);

  //     doc.moveDown(0.5);
  //     doc.moveTo(40, doc.y).lineTo(560, doc.y).stroke();

  //     // TABLE ROWS
  //     const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
  //     let calculatedSubtotal = 0;

  //     for (const item of bill.items) {
  //       const basicAmount = item.weight * item.pricePerGram;
  //       const makingChargeAmount = basicAmount * (item.makingCharge / 100);
  //       const total = basicAmount + makingChargeAmount;
  //       calculatedSubtotal += total;

  //       doc.moveDown(0.5);
  //       doc.text(item.name, cols[0]);
  //       doc.text(item.weight.toFixed(2), cols[1]);
  //       doc.text(`₹${round2(item.pricePerGram)}`, cols[2]);
  //       doc.text(`${round2(item.makingCharge)}%`, cols[3]);
  //       doc.text(`₹${round2(total)}`, cols[4]);
  //     }

  //     doc.moveDown(1);
  //     doc.moveTo(40, doc.y).lineTo(560, doc.y).stroke();

  //     // TOTALS (use DB values)
  //     const subtotal = bill.subtotal ?? calculatedSubtotal;
  //     const tax = bill.taxAmount ?? 0;
  //     const discount = bill.discount ?? 0;
  //     const grandTotal = bill.total ?? subtotal + tax - discount;

  //     doc
  //       .fontSize(11)
  //       .text(`Subtotal`, 380)
  //       .text(`₹${round2(subtotal)}`, 520, doc.y - 14, { align: 'right' })
  //       .moveDown(0.3)
  //       .text(`Tax (${bill.tax}%)`, 380)
  //       .text(`₹${round2(tax)}`, 520, doc.y - 14, { align: 'right' })
  //       .moveDown(0.3)
  //       .text(`Discount`, 380)
  //       .text(`₹-${round2(discount)}`, 520, doc.y - 14, { align: 'right' })
  //       .moveDown(1)
  //       .font('Helvetica-Bold')
  //       .text(`Grand Total`, 380)
  //       .fillColor('#1b9e77')
  //       .text(`₹${round2(grandTotal)}`, 520, doc.y - 14, { align: 'right' })
  //       .fillColor('black')
  //       .moveDown(2);

  //     // FOOTER
  //     doc
  //       .fontSize(9)
  //       .fillColor('gray')
  //       .text(
  //         'This is a computer-generated invoice — no signature required.\nAll jewellery sold is hallmarked as per BIS standards. Prices include GST.',
  //         { align: 'center' },
  //       )
  //       .moveDown(1)
  //       .fillColor('black')
  //       .fontSize(10)
  //       .text('Thank you for shopping with SWARN ABHUSHAN!', { align: 'center' });

  //     doc.end();
  //   });
  // }

  async generateInvoicePdf(billId: string): Promise<Buffer> {
    const bill = await this.findById(billId);
    if (!bill) throw new NotFoundException('Bill not found');

    const templateHtml = fs.readFileSync(path.join(__dirname, 'invoice.template.html'), 'utf-8');
    const template = Handlebars.compile(templateHtml);

    const logoPath = path.resolve('src/assets/brand_logo.png');
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    const ext = path.extname(logoPath).substring(1); // "png"

    const logoDataUrl = `data:image/${ext};base64,${logoBase64}`;

    const data = {
      logoPath: logoDataUrl,
      billNumber: bill.billNumber,
      date: new Date(bill.createdAt).toLocaleDateString(),
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      items: bill.items.map(item => ({
        ...item,
        total: (item.weight * item.pricePerGram * (1 + item.makingCharge / 100)).toFixed(2),
        weight: item.weight.toFixed(2)
      })),
      subtotal: bill.items.reduce((sum, item) => sum + item.weight * item.pricePerGram * (1 + item.makingCharge / 100), 0).toFixed(2),
      tax: bill.taxAmount.toFixed(2),
      discount: bill.discount.toFixed(2),
      total: bill.total.toFixed(2)
    };

    const html = template(data);
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfUint8 = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0' } });

    await browser.close();
    return Buffer.from(pdfUint8);
  }
}
