import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { ClauseSplitterService } from './clause-splitter.service.js';
import { DocxParserService } from './docx-parser.service.js';
import { ContractParsingService } from './parsing.service.js';
import { PdfParserService } from './pdf-parser.service.js';

@Module({
  imports: [StorageModule],
  providers: [
    PdfParserService,
    DocxParserService,
    ClauseSplitterService,
    ContractParsingService,
  ],
  exports: [ContractParsingService],
})
export class ParsingModule {}
