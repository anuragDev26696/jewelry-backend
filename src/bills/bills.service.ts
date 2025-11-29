import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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

  async generateInvoicePdf(billId: string): Promise<Buffer> {
    const bill = await this.findById(billId);
    if (!bill) throw new NotFoundException('Bill not found');

    const logoPath = path.join(process.cwd(), 'dist', 'assets', 'brand_logo.png');
    // const logoPath = path.resolve('src/assets/brand_logo.png');
    // const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    // const ext = path.extname(logoPath).substring(1); // "png"

    // const logoDataUrl = `data:image/${ext};base64,${logoBase64}`;
    // if (!fs.existsSync(logoDataUrl)) {
    //   throw new InternalServerErrorException('Logo file not found in /assets/logo.png');
    // }

    const data = {
      ...bill,
      ...bill,
      date: new Date(bill.createdAt).toLocaleDateString(),
      items: bill.items.map(item => {
        const itemTotal = item.weight * item.pricePerGram * (1 + item.makingCharge / 100);
        return {
          ...item,
          total: itemTotal.toFixed(2),
          weight: item.weight.toFixed(2),
          pricePerGram: item.pricePerGram.toFixed(2),
        };
      }),
      subtotal: bill.subtotal.toFixed(2),
      items: bill.items.map(item => {
        const itemTotal = item.weight * item.pricePerGram * (1 + item.makingCharge / 100);
        return {
          ...item,
          total: itemTotal.toFixed(2),
          weight: item.weight.toFixed(2),
          pricePerGram: item.pricePerGram.toFixed(2),
        };
      }),
      subtotal: bill.subtotal.toFixed(2),
      tax: bill.taxAmount.toFixed(2),
      discount: bill.discount.toFixed(2),
      total: bill.total.toFixed(2)
    };

    return new Promise<Buffer>((resolve, reject) => {      
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // styles
      const primaryColor = '#d62828'; 
      const highlightColor = '#fcbf49'; 
      const lightHighlightColor = '#fcbf4980';

      const colStart = 36;
      const colWidths = [150, 80, 80, 80, 150]; // Item, Weight, Rate/g, Making, Total
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);  // 540

      // let y_position = doc.y;
      let y_position = 36; // Start printing at the top margin (36)
      doc.y = y_position; // Ensure doc's internal y-position starts here

      // A. Logo Insertion (Top Right)
      const LOGO_SIZE = 80;
      const LOGO_X = colStart + tableWidth - LOGO_SIZE; // 540 - 80 = 460
      const LOGO_Y = y_position; 

      // Use doc.image() with the path and options
      doc.image(logoPath, LOGO_X, LOGO_Y, {
          width: LOGO_SIZE,
          height: LOGO_SIZE,
          // You can apply clip/masking here to get a circular image if needed
          // mask: doc.circle(LOGO_X + LOGO_SIZE/2, LOGO_Y + LOGO_SIZE/2, LOGO_SIZE/2) 
      });

      // Header Section
      doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold').text('SWARN AABHUSHAN', colStart, y_position);
      // Move text position down to avoid overlapping the logo
      doc.y = LOGO_Y + LOGO_SIZE / 2; // Set y below the middle of the logo height
      doc.fillColor('black').fontSize(8).font('Helvetica')
        .text('Naigarhi, Mauganj, Madhya Pradesh - 486341', { continued: false })
        .text(`Phone: +91 94249 81420 | Email: contact@swarnjeweller.in`, { continued: false })
        .text(`GSTIN: 09ABCDE1234F1Z6`, { continued: false });
      
      // Add logo (Note: you must use doc.image with a file path or Buffer, not a Data URL)
      // For simplicity, we skip image embedding here as it requires resolving the actual file.

      doc.strokeColor(primaryColor).lineWidth(2).moveTo(colStart, doc.y + 5).lineTo(colStart + tableWidth, doc.y + 5).stroke();
      doc.moveDown(1.5);

      // B. Invoice Details Section
      y_position = doc.y;
      const sectionHeight = 60;
      doc.rect(colStart, y_position, tableWidth, sectionHeight).lineWidth(2).strokeColor(highlightColor).stroke();

      const paddingX = 12;
      const startX = colStart + paddingX;
      const detailsY = y_position + 10;
      const customerStartX = 300;

      doc.fillColor('black').fontSize(10).font('Helvetica-Bold')
       .text(`Invoice No:`, startX, detailsY)
       .font('Helvetica').text(`${data.billNumber}`, startX + 60, detailsY, { continued: false });
      doc.font('Helvetica-Bold').text(`Date:`, startX, detailsY + 15)
        .font('Helvetica').text(`${data.date}`, startX + 60, detailsY + 15, { continued: false });
      doc.font('Helvetica-Bold').text(`Customer:`, customerStartX, detailsY)
        .font('Helvetica').text(`${data.customerName}`, customerStartX + 50, detailsY, { continued: false });
      doc.font('Helvetica-Bold').text(`Phone:`, customerStartX, detailsY + 15)
        .font('Helvetica').text(`${data.customerPhone}`, customerStartX + 50, detailsY + 15, { continued: false });

      doc.moveDown(5);

      // C. Table Section
      const tableTop = doc.y;
      const itemHeight = 20;
      const cellPadding = 5;
      let currentY = tableTop;

      // Header
      doc.fillColor(lightHighlightColor).rect(colStart, currentY, tableWidth, itemHeight).fill();
      doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
        
      ['Item', 'Weight (g)', 'Rate/g', 'Making', 'Total'].forEach((header, i) => {
          const width = colWidths[i];
          const prevWidths = colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          const currentX = colStart + prevWidths;
          const align: PDFKit.Mixins.TextOptions['align'] = (i === 4) ? 'right' : (i > 0 && i < 4) ? 'center' : 'left';
          
          let textX = currentX + cellPadding;
          if (i === 4) textX = currentX + width - doc.widthOfString(header) - cellPadding;
          
          doc.text(header, textX, currentY + cellPadding, { width: width - (2 * cellPadding), align: align, lineBreak: false });
      });
      currentY += itemHeight;

      // Body
      doc.font('Helvetica').fillColor('black');
      data.items.forEach(item => {
        doc.lineWidth(1).strokeColor('#ccc').moveTo(colStart, currentY).lineTo(colStart + tableWidth, currentY).stroke();

        [
          item.name, 
          item.weight, 
          `₹${item.pricePerGram}`, 
          `${item.makingCharge}%`, 
          `₹${item.total}`
        ].forEach((cellText, i) => {
            const width = colWidths[i];
            const prevWidths = colWidths.slice(0, i).reduce((a, b) => a + b, 0);
            const currentX = colStart + prevWidths;

            const align: PDFKit.Mixins.TextOptions['align'] = (i === 4) ? 'right' : (i > 0 && i < 4) ? 'center' : 'left';

            let textX = currentX + cellPadding;
            if (i === 4) textX = currentX + width - doc.widthOfString(cellText) - cellPadding;
            
            doc.text(cellText, textX, currentY + cellPadding, { width: width - (2 * cellPadding), align: align, lineBreak: false });
        });
        currentY += itemHeight;
      });

      doc.lineWidth(1).strokeColor('#ccc').moveTo(colStart, currentY).lineTo(colStart + tableWidth, currentY).stroke();
    
      // D. Table Footer (Totals)
      const totalColStart = colStart + colWidths[0] + colWidths[1] + colWidths[2];
      const totalColWidth = colWidths[3] + colWidths[4];
      const rightAlignStart = totalColStart - 100;
      const valueAlignStart = totalColStart + 10;

      currentY += 5;
      doc.font('Helvetica-Bold').text('Subtotal:', rightAlignStart, currentY, { width: 100, align: 'right' });
      doc.text(`₹${data.subtotal}`, valueAlignStart, currentY, { width: totalColWidth - 20, align: 'right' });
      
      currentY += 15;
      doc.text('Tax:', rightAlignStart, currentY, { width: 100, align: 'right' });
      doc.text(`₹${data.tax}`, valueAlignStart, currentY, { width: totalColWidth - 20, align: 'right' });
      
      currentY += 15;
      doc.text('Discount:', rightAlignStart, currentY, { width: 100, align: 'right' });
      doc.text(`₹${data.discount}`, valueAlignStart, currentY, { width: totalColWidth - 20, align: 'right' });
      
      currentY += 15;
      doc.strokeColor('black').lineWidth(2).moveTo(totalColStart, currentY).lineTo(colStart + tableWidth, currentY).stroke();

      currentY += 5;
      doc.fontSize(12).text('Grand Total:', rightAlignStart, currentY, { width: 100, align: 'right' });
      doc.text(`₹${data.total}`, valueAlignStart, currentY, { width: totalColWidth - 20, align: 'right' });
      
      currentY += 25;
      doc.strokeColor('black').lineWidth(2).moveTo(totalColStart, currentY).lineTo(colStart + tableWidth, currentY).stroke();

      // E. Footer Section
      doc.fillColor('gray').fontSize(8).font('Helvetica').moveDown(3)
        .text('This is a computer-generated invoice — no signature required.', { align: 'center' })
        .text('All jewellery sold is hallmarked as per BIS standards. Prices include GST.', { align: 'center' }).moveDown(0.5);

      doc.fillColor('black').fontSize(10).font('Helvetica-Bold')
        .text('Thank you for shopping with SWARN AABHUSHAN!', { align: 'center' });

      doc.end();
    });
  }

  // async generateInvoicePdf(billId: string): Promise<Buffer> {
  //   const bill = await this.findById(billId);
  //   if (!bill) throw new NotFoundException('Bill not found');

  //   const templateHtml = fs.readFileSync(path.join(__dirname, 'invoice.template.html'), 'utf-8');
  //   const template = Handlebars.compile(templateHtml);

  //   const logoPath = path.resolve('src/assets/brand_logo.png');
  //   const logoBase64 = fs.readFileSync(logoPath).toString('base64');
  //   const ext = path.extname(logoPath).substring(1); // "png"

  //   const logoDataUrl = `data:image/${ext};base64,${logoBase64}`;

  //   const data = {
  //     logoPath: logoDataUrl,
  //     billNumber: bill.billNumber,
  //     date: new Date(bill.createdAt).toLocaleDateString(),
  //     customerName: bill.customerName,
  //     customerPhone: bill.customerPhone,
  //     items: bill.items.map(item => ({
  //       ...item,
  //       total: (item.weight * item.pricePerGram * (1 + item.makingCharge / 100)).toFixed(2),
  //       weight: item.weight.toFixed(2)
  //     })),
  //     subtotal: bill.items.reduce((sum, item) => sum + item.weight * item.pricePerGram * (1 + item.makingCharge / 100), 0).toFixed(2),
  //     tax: bill.taxAmount.toFixed(2),
  //     discount: bill.discount.toFixed(2),
  //     total: bill.total.toFixed(2)
  //   };

  //   const html = template(data);
  //   const browser = await puppeteer.launch({
  //     headless: true,
  //     args: [
  //       "--no-sandbox",
  //       "--disable-setuid-sandbox",
  //       "--disable-gpu",
  //       "--no-zygote",
  //       "--single-process",
  //     ],
  //   });
  //   const page = await browser.newPage();
  //   await page.setContent(html, { waitUntil: 'networkidle0' });

  //   const pdfUint8 = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0' } });

  //   await browser.close();
  //   return Buffer.from(pdfUint8);
  // }
}
