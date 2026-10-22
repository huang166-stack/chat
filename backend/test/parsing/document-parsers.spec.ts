import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { DocxParserService } from '../../src/parsing/docx-parser.service.js';
import { PdfParserService } from '../../src/parsing/pdf-parser.service.js';

async function createPdf(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const firstPage = pdf.addPage();
  firstPage.drawText('Article 1 Payment', {
    x: 50,
    y: 700,
    font,
    size: 14,
  });
  firstPage.drawText('Payment is due within 30 days.', {
    x: 50,
    y: 670,
    font,
    size: 12,
  });

  const secondPage = pdf.addPage();
  secondPage.drawText('Article 2 Confidentiality', {
    x: 50,
    y: 700,
    font,
    size: 14,
  });
  secondPage.drawText('Both parties shall keep the information confidential.', {
    x: 50,
    y: 670,
    font,
    size: 12,
  });

  return Buffer.from(await pdf.save());
}

async function createDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
  );
  zip
    .folder('_rels')
    ?.file(
      '.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    );
  zip
    .folder('word')
    ?.file(
      'document.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body>' +
        '<w:p><w:r><w:t>第一条 付款方式</w:t></w:r></w:p>' +
        '<w:p><w:r><w:t>买方应在验收后支付货款。</w:t></w:r></w:p>' +
        '<w:p><w:r><w:t>第二条 保密义务</w:t></w:r></w:p>' +
        '<w:p><w:r><w:t>双方应对商业秘密保密。</w:t></w:r></w:p>' +
        '</w:body>' +
        '</w:document>',
    );

  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
}

describe('document parsers', () => {
  it('extracts PDF text by page with exact character ranges', async () => {
    const parser = new PdfParserService();
    const parsed = await parser.parse(await createPdf());

    expect(parsed.pageCount).toBe(2);
    expect(parsed.pages).toHaveLength(2);
    expect(parsed.pages[0].text).toContain('Article 1 Payment');
    expect(parsed.pages[1].text).toContain('Article 2 Confidentiality');

    parsed.pages.forEach((page) => {
      expect(parsed.text.slice(page.charStart, page.charEnd)).toBe(page.text);
    });
  });

  it('extracts DOCX paragraphs in their original order', async () => {
    const parser = new DocxParserService();
    const parsed = await parser.parse(await createDocx());

    expect(parsed.text).toContain('第一条 付款方式');
    expect(parsed.text).toContain('买方应在验收后支付货款。');
    expect(parsed.text).toContain('第二条 保密义务');
    expect(parsed.text.indexOf('第一条')).toBeLessThan(
      parsed.text.indexOf('第二条'),
    );
    expect(parsed.pages).toEqual([]);
  });
});
