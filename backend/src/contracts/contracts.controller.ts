import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
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
import { ContractQueryDto } from './dto/contract-query.dto.js';
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
    return this.contractsService.upload(user.userId, file, dto, user.role);
  }

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.contractsService.getOverview(user.userId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ContractQueryDto) {
    return this.contractsService.findAll(user.userId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.contractsService.findOne(user.userId, BigInt(id));
  }
}
