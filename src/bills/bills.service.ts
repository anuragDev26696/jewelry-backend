import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { paginate, PaginationOptions, PaginationResult } from 'src/common/interface/pagination.interface';
import { CreateBillDto } from 'src/dtos/bill.dto';
import { Bill, BillDocument } from 'src/schemas/bill.schema';
import { UsersService } from 'src/users/users.service';
import { BillType, UpdateBillPayment } from 'src/common/interface/bill.interface';
import { User } from 'src/schemas/user.schema';
import * as path from 'path';
import PDFDocument from 'pdfkit';
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
        throw new NotFoundException('Bill bill found');
      
      const user = await this.userService.findById(bill.customerId);
      if(!user) {
        throw new BadRequestException('Invalid   user');
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

  async update(uuid: string, billReq: CreateBillDto): Promise<BillType | null> {
    try {
      const existing = await this.billModel.findOne({uuid, isDeleted: false}).exec();
      if(!existing) {
        throw new BadRequestException('Bill not found');
      }
      
      existing.set({ ...billReq });
      await existing.save();
      return await this.findById(uuid);
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
  

  round2(v: number): number {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  async generateInvoicePdf(billId: string): Promise<Buffer> {
    try {
      const bill = await this.findById(billId);
      if (!bill) throw new NotFoundException('Bill not found');

      const logoPath = path.join(process.cwd(), 'dist', 'assets', 'brand_logo.png');

      const formatCurrency = (num: number) =>
        new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(num);

      const data = {
        ...bill,
        date: new Date(bill.createdAt).toLocaleDateString(),
        items: bill.items.map(item => {
          const itemTotal =
            item.weight * item.pricePerGram * (1 + item.makingCharge / 100);
          return {
            ...item,
            total: formatCurrency(itemTotal),
            weight: item.weight.toFixed(2),
            pricePerGram: formatCurrency(item.pricePerGram),
          };
        }),
        subtotal: formatCurrency(bill.subtotal),
        tax: formatCurrency(bill.taxAmount),
        discount: formatCurrency(bill.discount),
        total: formatCurrency(bill.total),
      };

      return new Promise<Buffer>((resolve, reject) => {
        const doc: PDFKit.PDFDocument = new PDFDocument({ size: 'A4', margin: 0 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
        const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');

        doc.registerFont('Roboto', path.join(fontsDir, 'Roboto-Regular.ttf'));
        doc.registerFont('Roboto-Bold', path.join(fontsDir, 'Roboto-Bold.ttf'));

        // doc.registerFont('Roboto', path.join(process.cwd(), 'fonts', 'Roboto-Regular.ttf'));
        // doc.registerFont('Roboto-Bold', path.join(process.cwd(), 'fonts', 'Roboto-Bold.ttf'));

        // CONSTANTS
        const M = 24;
        const TABLE_WIDTH = 540;
        const RUPEE = '₹';
        const primary = '#d62828';
        const highlight = '#fcbf49';
        // const lightHighlight = '#fcbf4980';

        // ------------------------------------------------------------
        // **1. HEADER WITH FIXED POSITIONING**
        // ------------------------------------------------------------
        const centerX = M + 35; // center of circle (image x + half width)
        const centerY = M + 25; // center of circle (adjust as needed)
        const radius = 35;      // half of image width/height

        doc.save();              // save current state
        doc.circle(centerX, centerY, radius).clip(); // create circular clipping
        doc.image(logoPath, M, M - 10, { width: 70, height: 70 });
        doc.restore();           // restore to remove clipping

        // doc.image(logoPath, M, M - 10, { width: 70 });

        doc
          .fillColor(primary)
          .font('Roboto-Bold')
          .fontSize(22)
          .text('SWARN AABHUSHAN', M + 90, M - 10);

        doc
          .fontSize(9)
          .font('Roboto')
          .fillColor('black')
          .text('Naigarhi, Opposite State Bank, Mauganj, Madhya Pradesh - 486341')
          .moveDown(0.1)
          .text('Phone: +91 94249 81420')
          .text('Email: contact@swarnjeweller.in')
          .moveDown(0.1)
          .text('GSTIN: 09ABCDE1234F1Z6');

        // Clean Divider
        doc
          .strokeColor('#ccc')
          .lineWidth(2)
          .moveTo(M, 105)
          .lineTo(M + TABLE_WIDTH, 105)
          .stroke();

        // ------------------------------------------------------------
        // **2. INVOICE BOX**
        // ------------------------------------------------------------
        const boxY = 130;
        doc
          .lineWidth(2)
          .strokeColor(highlight)
          .roundedRect(M, boxY, TABLE_WIDTH, 50, 8)
          .stroke();

        doc.font('Roboto-Bold').fontSize(11);

        doc.text('Invoice No:', M + 12, boxY + 10);
        doc.text('Date:', M + 12, boxY + 28);

        doc.font('Roboto');
        doc.text(data.billNumber, M + 100, boxY + 10);
        doc.text(data.date, M + 100, boxY + 28);

        doc.font('Roboto-Bold');
        doc.text('Customer:', 350, boxY + 10);
        doc.text('Phone:', 350, boxY + 28);

        doc.font('Roboto');
        doc.text(data.customerName || '', 430, boxY + 10);
        doc.text(data.customerPhone || '', 430, boxY + 28);

        // ------------------------------------------------------------
        // **3. TABLE HEADER WITH FULL BORDER**
        // ------------------------------------------------------------
        let y = 200;

        const col = [150, 90, 90, 90, 120];
        const head = ['Item', 'Weight (g)', 'Rate/g', 'Making', 'Total'];
        const align: ('left' | 'center' | 'right')[] = [
          'left',
          'center',
          'center',
          'center',
          'right',
        ];

        // Header background + border

        doc.save();
        doc
          .rect(M, y, TABLE_WIDTH, 30)
          .lineWidth(1)
          .strokeColor('#ccc')
          .stroke(); // draw border first

        doc
          .rect(M, y, TABLE_WIDTH, 30)
          .fillOpacity(0.5)
          .fill('#fcbf49'); // fill after stroke
        doc.restore();

        doc.font('Roboto-Bold').fontSize(10).fillColor('black');

        let x = M;
        head.forEach((txt, i) => {
          const w = col[i];
          const tx = getAlignedX(doc, txt, x, w, align[i]);
          doc.text(txt, tx, y + 10);
          x += w;
        });

        doc.fillColor("black");
        // ------------------------------------------------------------
        // **4. TABLE ROWS**
        // ------------------------------------------------------------
        y += 30;
        doc.font('Roboto').fontSize(10);

        data.items.forEach(it => {
          // Row border
          doc
            .strokeColor('#ccc')
            .lineWidth(1)
            .rect(M, y, TABLE_WIDTH, 26)
            .stroke();

          const rowData = [
            it.name,
            it.weight,
            `${RUPEE}${it.pricePerGram}`,
            `${it.makingCharge}%`,
            `${RUPEE}${it.total}`,
          ];

          let xx = M;
          rowData.forEach((t, i) => {
            const w = col[i];
            const tx = getAlignedX(doc, t, xx, w, align[i]);
            doc.text(String(t), tx, y + 7);
            xx += w;
          });

          y += 26;
        });

        // Bottom border
        // doc.rect(M, y, TABLE_WIDTH, 1).stroke();

        // ------------------------------------------------------------
        // **5. IMPROVED TOTALS SECTION (Right aligned)**
        // ------------------------------------------------------------
        const valueWidth = 200;
        const valueX = M + TABLE_WIDTH - valueWidth - 10;

        const totals = [
          ['Subtotal:', data.subtotal],
          ['Discount:', data.discount],
          ['Tax:', data.tax],
        ];

        doc.font('Roboto-Bold');

        totals.forEach(([label, value]) => {
          y += 18;
          doc.text(label, M + 10, y);
          doc.text(`${RUPEE}${value}`, valueX, y, {
            width: valueWidth,
            align: 'right',
          });
        });

        // Divider
        y += 25;
        doc
          .strokeColor('black')
          .lineWidth(2)
          .moveTo(M, y)
          .lineTo(M + TABLE_WIDTH, y)
          .stroke();

        // Grand Total
        y += 8;
        doc.fontSize(13).font('Roboto-Bold');
        doc.text('Grand Total:', M + 10, y);
        doc.text(`${RUPEE}${data.total}`, valueX, y, {
          width: valueWidth,
          align: 'right',
        });

        // ------------------------------------------------------------
        // **6. FOOTER**
        // ------------------------------------------------------------
        y += 40;

        doc
          .font('Roboto')
          .fontSize(9)
          .fillColor('gray')
          .text('This is a computer-generated invoice — no signature required.', 0, y, {
            align: 'center',
          });

        y += 14;
        doc
          .font('Roboto')
          .fontSize(9)
          .fillColor('gray')
          .moveDown(0.2)
          .text('All jewellery sold is hallmarked as per BIS standards. Prices include GST.', 0, y, {
            align: 'center',
          });

        y += 20;

        doc
          .font('Roboto-Bold')
          .fontSize(11)
          .fillColor('black')
          .text('Thank you for shopping with SWARN AABHUSHAN!', 0, y, {
            align: 'center',
          });

        doc.end();

        // Helper for alignment
        function getAlignedX(
          doc: PDFKit.PDFDocument,
          text: string,
          colX: number,
          width: number,
          align: 'left' | 'right' | 'center',
        ): number {
          const tw = doc.widthOfString(text);
          if (align === 'right') return colX + width - tw - 12;
          if (align === 'center') return colX + width / 2 - tw / 2;
          return colX + 8;
        }
      });
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }
}
