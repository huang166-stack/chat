import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1';

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const key = configService.get<string>('encryptionKey') ?? '';
    if (!/^[a-fA-F0-9]{64}$/.test(key)) {
      throw new Error('APP_ENCRYPTION_KEY must be a 64-character hex string');
    }

    this.key = Buffer.from(key, 'hex');
  }

  encrypt(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [PREFIX, iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
  }

  decrypt(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (!value.startsWith(`${PREFIX}:`)) {
      return value;
    }

    const parts = value.split(':');
    if (parts.length !== 5) {
      throw new Error('Invalid encrypted value');
    }

    const [algorithm, version, ivHex, tagHex, dataHex] = parts;
    if (algorithm !== 'enc' || version !== 'v1' || !ivHex || !tagHex || !dataHex) {
      throw new Error('Invalid encrypted value');
    }

    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }
}
