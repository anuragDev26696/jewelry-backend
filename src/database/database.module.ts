import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        if (!uri) throw new Error('❌ MONGO_URI is not defined');

        try {
          const mongoose = await import('mongoose');
          await mongoose.connect(uri);
          await mongoose.disconnect();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`❌ MongoDB connection failed: ${message}`);
        }

        return {
          uri,
          connectionFactory: (connection: Connection) => connection,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
