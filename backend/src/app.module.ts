import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import configuration from './config/configuration.js';
import { RedisModule } from './config/redis.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MemberPlansModule } from './member-plans/member-plans.module.js';
import { ModelConfigsModule } from './model-configs/model-configs.module.js';
import { PaymentConfigsModule } from './payment-configs/payment-configs.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { AdminMemberPlansModule } from './admin/member-plans/admin-member-plans.module.js';
import { AdminUsersModule } from './admin/users/admin-users.module.js';
import { AdminOrdersModule } from './admin/orders/admin-orders.module.js';
import { AdminDashboardModule } from './admin/dashboard/admin-dashboard.module.js';
import { AdminRulesModule } from './admin/rules/admin-rules.module.js';
import { UsersModule } from './users/users.module.js';
import { PaymentModule } from './payment/payment.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { QueueModule } from './queue/queue.module.js';
import { StorageModule } from './storage/storage.module.js';
import { ContractsModule } from './contracts/contracts.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    RedisModule,
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    AdminUsersModule,
    AdminMemberPlansModule,
    AdminOrdersModule,
    AdminDashboardModule,
    AdminRulesModule,
    MembershipsModule,
    MemberPlansModule,
    ModelConfigsModule,
    PaymentConfigsModule,
    PaymentModule,
    OrdersModule,
    ConversationsModule,
    StorageModule,
    QueueModule,
    ContractsModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
