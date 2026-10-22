import { Injectable } from '@nestjs/common';
import type {
  ClauseType,
  ParsedClause,
  ParsedDocument,
} from './parsing.types.js';

const MAX_CLAUSE_CHARS = 6000;
const MIN_CLAUSE_CHARS = 1200;
const MAX_HEADING_CHARS = 120;
const MIN_PREAMBLE_CHARS = 20;

const CLAUSE_BOUNDARY_PATTERNS = [
  /^第[一二三四五六七八九十百千万零〇两\d]+(?:条|章|节|部分)(?:[\s、.．:：]|$)/,
  /^\d{1,3}(?:\.\d{1,3})*[.、．]\s*(?=\S)/,
  /^[（(][一二三四五六七八九十百千万零〇两\d]+[)）]\s*(?=\S)/,
  /^[一二三四五六七八九十]+[、.．]\s*(?=\S)/,
];

const CLAUSE_TYPE_RULES: Array<{
  type: ClauseType;
  patterns: RegExp[];
}> = [
  {
    type: 'PAYMENT',
    patterns: [/付款|支付|价款|货款|费用|发票|结算|账期|payment|invoice/gi],
  },
  {
    type: 'BREACH',
    patterns: [/违约|赔偿|损失|责任上限|breach|liability/gi],
  },
  {
    type: 'TERMINATION',
    patterns: [/终止|解除|到期|提前退出|terminate|termination/gi],
  },
  {
    type: 'CONFIDENTIALITY',
    patterns: [/保密|商业秘密|机密|confidential/gi],
  },
  {
    type: 'INTELLECTUAL_PROPERTY',
    patterns: [
      /知识产权|著作权|专利|商标|软件|intellectual property|copyright/gi,
    ],
  },
  {
    type: 'DISPUTE_RESOLUTION',
    patterns: [/争议|仲裁|诉讼|管辖|法院|dispute|arbitration|jurisdiction/gi],
  },
];

interface TextLine {
  start: number;
  end: number;
  text: string;
}

interface TextSegment {
  start: number;
  end: number;
}

@Injectable()
export class ClauseSplitterService {
  split(document: ParsedDocument): ParsedClause[] {
    if (!document.text.trim()) {
      return [];
    }

    const boundaries = this.findBoundaries(document.text);
    const segments =
      boundaries.length > 0
        ? this.segmentsFromBoundaries(document.text, boundaries)
        : this.paragraphSegments(document.text);
    const clauses: ParsedClause[] = [];

    for (const segment of segments) {
      const clauseType = this.classifyClause(
        document.text.slice(segment.start, segment.end),
      );

      for (const part of this.splitLongSegment(document.text, segment)) {
        const range = this.trimRange(document.text, part.start, part.end);
        if (!range) continue;

        const content = document.text.slice(range.start, range.end);
        const heading = this.extractHeading(document.text, range);
        const pageRange = this.resolvePages(document, range.start, range.end);

        clauses.push({
          orderNo: clauses.length + 1,
          clauseType,
          heading,
          content,
          pageStart: pageRange.pageStart,
          pageEnd: pageRange.pageEnd,
          charStart: range.start,
          charEnd: range.end,
        });
      }
    }

    return clauses;
  }

  private findBoundaries(text: string): number[] {
    return this.splitLines(text)
      .filter((line) => line.text && this.isClauseBoundary(line.text))
      .map((line) => line.start);
  }

  private isClauseBoundary(line: string): boolean {
    return CLAUSE_BOUNDARY_PATTERNS.some((pattern) => pattern.test(line));
  }

  private segmentsFromBoundaries(
    text: string,
    boundaries: number[],
  ): TextSegment[] {
    const segments: TextSegment[] = [];
    const preamble = text.slice(0, boundaries[0]).trim();
    if (preamble.length >= MIN_PREAMBLE_CHARS) {
      segments.push({ start: 0, end: boundaries[0] });
    }

    boundaries.forEach((start, index) => {
      segments.push({
        start,
        end: boundaries[index + 1] ?? text.length,
      });
    });

    return segments;
  }

  private paragraphSegments(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    const lines = this.splitLines(text);
    let segmentStart: number | null = null;
    let segmentEnd = 0;

    for (const line of lines) {
      if (!line.text) {
        if (segmentStart !== null) {
          segments.push({ start: segmentStart, end: segmentEnd });
          segmentStart = null;
        }
        continue;
      }

      segmentStart ??= line.start;
      segmentEnd = line.end;
    }

    if (segmentStart !== null) {
      segments.push({ start: segmentStart, end: segmentEnd });
    }

    return segments;
  }

  private splitLongSegment(text: string, segment: TextSegment): TextSegment[] {
    const parts: TextSegment[] = [];
    let cursor = segment.start;

    while (cursor < segment.end) {
      if (segment.end - cursor <= MAX_CLAUSE_CHARS) {
        parts.push({ start: cursor, end: segment.end });
        break;
      }

      const splitAt = this.findSplitPoint(text, cursor, segment.end);
      parts.push({ start: cursor, end: splitAt });
      cursor = splitAt;
    }

    return parts;
  }

  private findSplitPoint(text: string, start: number, end: number): number {
    const limit = Math.min(start + MAX_CLAUSE_CHARS, end);
    const window = text.slice(start, limit);
    const minimum = Math.floor(MAX_CLAUSE_CHARS * 0.35);
    let bestOffset = 0;

    for (const separator of ['\n\n', '。', '！', '？', '；', ';', '\n']) {
      const index = window.lastIndexOf(separator);
      if (index < minimum) continue;

      const offset = index + separator.length;
      if (offset > bestOffset) {
        bestOffset = offset;
      }
    }

    if (bestOffset > 0) {
      return start + bestOffset;
    }

    const fallback = start + MIN_CLAUSE_CHARS * 2;
    return Math.min(fallback, limit);
  }

  private trimRange(
    text: string,
    start: number,
    end: number,
  ): TextSegment | null {
    let trimmedStart = start;
    let trimmedEnd = end;

    while (trimmedStart < trimmedEnd && /\s/.test(text[trimmedStart])) {
      trimmedStart += 1;
    }
    while (trimmedEnd > trimmedStart && /\s/.test(text[trimmedEnd - 1])) {
      trimmedEnd -= 1;
    }

    return trimmedStart < trimmedEnd
      ? { start: trimmedStart, end: trimmedEnd }
      : null;
  }

  private extractHeading(text: string, range: TextSegment): string | null {
    const lineEnd = text.indexOf('\n', range.start);
    const firstLine = text
      .slice(
        range.start,
        lineEnd === -1 || lineEnd > range.end ? range.end : lineEnd,
      )
      .trim();

    if (
      !firstLine ||
      firstLine.length > MAX_HEADING_CHARS ||
      (!this.isClauseBoundary(firstLine) && /[。！？；;]$/.test(firstLine))
    ) {
      return null;
    }

    return firstLine.replace(/[：:。；;]$/, '').slice(0, 255) || null;
  }

  private classifyClause(content: string): ClauseType {
    let bestType: ClauseType = 'OTHER';
    let bestScore = 0;

    for (const rule of CLAUSE_TYPE_RULES) {
      const score = rule.patterns.reduce(
        (total, pattern) => total + (content.match(pattern)?.length ?? 0),
        0,
      );
      if (score > bestScore) {
        bestType = rule.type;
        bestScore = score;
      }
    }

    return bestType;
  }

  private resolvePages(document: ParsedDocument, start: number, end: number) {
    if (document.pages.length === 0) {
      return { pageStart: null, pageEnd: null };
    }

    const startPage = document.pages.find(
      (page) => start >= page.charStart && start < page.charEnd,
    );
    const endProbe = Math.max(start, end - 1);
    const endPage = [...document.pages]
      .reverse()
      .find((page) => endProbe >= page.charStart && endProbe < page.charEnd);

    return {
      pageStart: startPage?.pageNumber ?? null,
      pageEnd: endPage?.pageNumber ?? startPage?.pageNumber ?? null,
    };
  }

  private splitLines(text: string): TextLine[] {
    const lines: TextLine[] = [];
    let lineStart = 0;

    for (let index = 0; index <= text.length; index += 1) {
      if (index !== text.length && text[index] !== '\n') continue;

      const raw = text.slice(lineStart, index);
      const leading = raw.length - raw.trimStart().length;
      const trailing = raw.trimEnd().length;
      lines.push({
        start: lineStart + leading,
        end: lineStart + trailing,
        text: raw.trim(),
      });
      lineStart = index + 1;
    }

    return lines;
  }
}
