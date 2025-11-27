import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ItemSchema, Item } from 'src/schemas/items.schema';
// import { APP_GUARD } from '@nestjs/core';
// import { JwtAuthGuard } from 'src/common/guards/jwt/jwt.guard';

@Module({
  imports: [MongooseModule.forFeature([{ name: Item.name, schema: ItemSchema }])],
  controllers: [ItemsController],
  exports: [ItemsService],
  providers: [ItemsService,
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // }
  ],
})
export class ItemsModule {}
