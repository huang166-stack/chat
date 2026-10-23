import Link from 'next/link';

const QR_ROWS = [
  '111111101',
  '100000101',
  '101110101',
  '101110101',
  '101110101',
  '100000101',
  '111111101',
  '000000001',
  '101010101',
];

export function SiteFooter() {
  return (
    <footer id="about" className="border-t border-line bg-ink-950">
      <div className="marketing-container py-14 lg:py-18">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_.7fr_.7fr_.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-[2px] border border-brand-500/50 bg-brand-500/10 font-mono text-xs font-semibold text-brand-400">
                CR
              </span>
              <span className="font-semibold">合同审查助手</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-7 text-copy-muted">
              面向中小企业、法务与业务人员的合同审查与合规助手。让风险可解释、可定位、可审计。
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-copy-subtle">
              Text PDF / DOCX · Clause-level evidence · Private by default
            </p>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-400">
              产品
            </p>
            <ul className="mt-4 space-y-3 text-sm text-copy-muted">
              <li><Link className="transition hover:text-copy" href="/#product">合同审查</Link></li>
              <li><Link className="transition hover:text-copy" href="/#capabilities">条款定位</Link></li>
              <li><Link className="transition hover:text-copy" href="/#capabilities">合同问答</Link></li>
              <li><Link className="transition hover:text-copy" href="/#pricing">定价</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-400">
              支持
            </p>
            <ul className="mt-4 space-y-3 text-sm text-copy-muted">
              <li><Link className="transition hover:text-copy" href="/login">登录账号</Link></li>
              <li><Link className="transition hover:text-copy" href="/register">创建账号</Link></li>
              <li><Link className="transition hover:text-copy" href="/membership">会员中心</Link></li>
              <li><Link className="transition hover:text-copy" href="/design">设计系统</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-400">
              产品入口
            </p>
            <div className="mt-4 inline-grid grid-cols-9 gap-0.5 border border-line bg-ink-800 p-2" aria-hidden="true">
              {QR_ROWS.flatMap((row, rowIndex) =>
                Array.from(row).map((cell, columnIndex) => (
                  <span
                    key={`${rowIndex}-${columnIndex}`}
                    className={`h-1.5 w-1.5 ${cell === '1' ? 'bg-brand-400' : 'bg-transparent'}`}
                  />
                )),
              )}
            </div>
            <p className="mt-3 max-w-[9rem] text-xs leading-5 text-copy-subtle">
              部署后替换为正式产品二维码
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-copy-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 合同审查助手 · 自动化结果不构成法律意见</p>
          <p>备案信息与联系方式将在正式部署时配置</p>
        </div>
      </div>
    </footer>
  );
}
