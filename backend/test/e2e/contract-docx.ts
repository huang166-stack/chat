import { randomBytes } from 'node:crypto';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';

export interface ContractDocxOptions {
  confidentiality?: boolean;
  dataProtection?: boolean;
  paddingBytes?: number;
  paymentDays?: number;
  unilateralTermination?: boolean;
}

export async function createContractDocx(options: ContractDocxOptions = {}) {
  const labels = [`合同样本 ${randomBytes(3).toString('hex')}`];
  labels.push('第一条 付款方式');
  labels.push(
    `乙方应在收到发票后 ${options.paymentDays ?? 90} 日内支付全部价款，逾期应按合同约定承担违约责任。`,
  );
  if (options.confidentiality !== false) {
    labels.push('第二条 保密义务');
    labels.push(
      '双方应对履约过程中知悉的商业秘密和其他保密信息承担保密义务，未经书面同意不得向第三方披露。',
    );
  }
  labels.push('第三条 合同解除');
  labels.push(
    options.unilateralTermination
      ? '甲方有权随时单方解除本合同且无需承担任何责任，乙方不得提出异议。'
      : '任何一方解除合同应提前三十日书面通知对方，并完成已发生权利义务的结算。',
  );
  if (options.dataProtection !== false) {
    labels.push('第四条 数据保护');
    labels.push(
      '双方应遵守个人信息保护和数据安全要求，发生数据泄露时应及时通知对方并采取补救措施。',
    );
  }
  labels.push('第五条 责任限制');
  labels.push(
    '除故意或重大过失外，任一方累计赔偿责任以合同总金额为上限，不承担间接损失。',
  );
  labels.push('第六条 争议解决');
  labels.push('因本合同产生的争议，双方应友好协商；协商不成的，提交合同签订地人民法院管辖。');

  const document = new Document({
    sections: [
      {
        children: labels.map(
          (text) =>
            new Paragraph({
              children: [new TextRun({ text })],
            }),
        ),
      },
    ],
  });
  const buffer = Buffer.from(await Packer.toBuffer(document));

  if (!options.paddingBytes) {
    return buffer;
  }

  const zip = await JSZip.loadAsync(buffer);
  zip.file('word/media/e2e-padding.bin', randomBytes(options.paddingBytes));
  return Buffer.from(
    await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' }),
  );
}
