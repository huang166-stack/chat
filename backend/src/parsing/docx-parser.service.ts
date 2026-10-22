import { Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import type { ParsedDocument, ParsedPage } from './parsing.types.js';

@Injectable()
export class DocxParserService {
  async parse(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = this.normalizeText(result.value);
      return {
        text,
        pages: this.extractExplicitPages(text),
        pageCount: 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`DOCX 解析失败：${message}`);
    }
  }

  private normalizeText(value: string): string {
    return value
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private extractExplicitPages(text: string): ParsedPage[] {
    if (!text.includes('\f')) {
      return [];
    }

    const pages: ParsedPage[] = [];
    let charStart = 0;

    text.split('\f').forEach((pageText, index) => {
      pages.push({
        pageNumber: index + 1,
        text: pageText,
        charStart,
        charEnd: charStart + pageText.length,
      });
      charStart += pageText.length + 1;
    });

    return pages;
  }
}
