import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ContractParsingService } from '../../parsing/parsing.service.js';
import type { ParseDocumentPayload } from '../queue.types.js';

@Injectable()
export class ParseProcessor {
  constructor(private readonly parsingService: ContractParsingService) {}

  process(job: Job<ParseDocumentPayload>) {
    return this.parsingService.parse(job.data);
  }
}
