import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../auth/auth-user.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ContractsService } from './contracts.service.js';
import {
  MAX_CONTRACT_FILE_BYTES,
  type UploadedContractFile,
} from './contracts.constants.js';
import { UploadContractDto } from './dto/upload-contract.dto.js';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_CONTRACT_FILE_BYTES,
        files: 1,
      },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedContractFile | undefined,
    @Body() dto: UploadContractDto,
  ) {
    return this.contractsService.upload(user.userId, file, dto);
  }
}
