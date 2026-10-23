import { forwardRef, Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module.js';
import { ReportProcessor } from '../queue/processors/report.processor.js';
import { StorageModule } from '../storage/storage.module.js';
import { ReportDocumentService } from './report-document.service.js';
import {
  ContractReportsController,
  ReportsController,
} from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [StorageModule, forwardRef(() => QueueModule)],
  controllers: [ContractReportsController, ReportsController],
  providers: [ReportsService, ReportDocumentService, ReportProcessor],
  exports: [ReportProcessor],
})
export class ReportsModule {}
