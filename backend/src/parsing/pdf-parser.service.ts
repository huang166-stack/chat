import { createRequire } from 'node:module';
import { dirname, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Injectable } from '@nestjs/common';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { ParsedDocument, ParsedPage } from './parsing.types.js';

const require = createRequire(import.meta.url);
const pdfjsRoot = dirname(
  dirname(dirname(require.resolve('pdfjs-dist/legacy/build/pdf.mjs'))),
);
const cMapUrl = pathToFileURL(join(pdfjsRoot, 'cmaps') + sep).href;
const standardFontDataUrl = pathToFileURL(
  join(pdfjsRoot, 'standard_fonts') + sep,
).href;

interface PdfTextItem {
  str?: unknown;
  hasEOL?: unknown;
}

@Injectable()
export class PdfParserService {
  async parse(buffer: Buffer): Promise<ParsedDocument> {
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
      disableFontFace: true,
      useWorkerFetch: false,
      verbosity: 0,
    });

    try {
      const pdf = await loadingTask.promise;
      const pages: ParsedPage[] = [];
      let text = '';

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = this.extractPageText(content.items);
        const separator = text.length > 0 && pageText.length > 0 ? '\n\n' : '';
        const charStart = text.length + separator.length;
        text += `${separator}${pageText}`;
        pages.push({
          pageNumber,
          text: pageText,
          charStart,
          charEnd: text.length,
        });
      }

      return {
        text,
        pages,
        pageCount: pdf.numPages,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PDF 解析失败：${message}`);
    } finally {
      await loadingTask.destroy();
    }
  }

  private extractPageText(items: unknown[]): string {
    const lines: string[] = [];
    let currentLine = '';

    for (const rawItem of items) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const item = rawItem as PdfTextItem;
      if (typeof item.str !== 'string') continue;

      currentLine += item.str;
      if (item.hasEOL === true) {
        this.pushLine(lines, currentLine);
        currentLine = '';
      }
    }

    this.pushLine(lines, currentLine);
    return lines.join('\n').trim();
  }

  private pushLine(lines: string[], line: string) {
    const normalized = line.replace(/[ \t\u00a0]+/g, ' ').trim();
    if (normalized) {
      lines.push(normalized);
    }
  }
}
