import type { ReactNode } from "react";

/** 品牌侧文案与标记，全部由调用方传入（组件内不内嵌业务文案） */
export interface AuthBrand {
  /** 品牌名 */
  name: string;
  /** 方形标记里的字，通常取品牌名首字 */
  mark: string;
  /** 主标语 */
  slogan: string;
  /** 价值点列表，逐条带勾选图标 */
  points: string[];
  /** 版权行 */
  copyright: string;
}

export interface AuthShellProps {
  brand: AuthBrand;
  /**
   * 表单卡最大宽度（px），默认 420。
   * 宽表单（如企业注册的两列栅格）传 680；窄屏下依旧 `w-full` 自适应，不会横向溢出。
   */
  cardWidth?: number;
  /** 表单卡内容。卡片外壳（宽度、留白、描边）由本组件负责，页面只关心卡内结构 */
  children: ReactNode;
}

function BrandMark({ text, size = 42 }: { text: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-md border border-jade-200 bg-jade-100 font-display font-bold text-jade-900"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
    >
      {text}
    </span>
  );
}

function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-[5px] size-4 shrink-0"
      fill="none"
    >
      <circle cx="8" cy="8" r="7.1" fill="var(--jade-100)" stroke="var(--jade-300)" />
      <path
        d="M5.1 8.2 6.9 10l4-4.2"
        stroke="var(--jade-700)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 登录 / 注册 / 重置密码共用的页面外壳。
 *
 * 左侧品牌区、右侧表单卡；`lg` 以下收起左侧，只在卡片上方留一行精简品牌行。
 *
 * **高度策略（`lg` 及以上）**：整屏固定 `100vh`，超出部分在**表单侧内部滚动**
 * （`lg:h-screen` + `lg:overflow-hidden` + 表单侧 `lg:overflow-y-auto` + `min-h-0`）。
 * 这样表单再长也不会把页面顶出一条外层滚动条 —— 品牌区始终铺满、卡片完整可见。
 * 卡片用 `my-auto` 而不是 `items-center` 居中：内容比视口高时，`align-items:center`
 * 会把顶部裁掉且滚不到，auto margin 在空间不足时自动归零，退化成顶对齐。
 * `lg` 以下不锁高度，交给页面正常滚动（手机本来就放不下）。
 *
 * 配色红线：规范 §02 限定深色（jade-600/700）只能出现在主按钮与行内小标签上、
 * 屏幕面积 < 8%。所以品牌区用的是**浅色**玉青底（`jade-50`）+ 深色文字（`jade-900`），
 * 而不是常见的「深色大色块」登录页画法。
 *
 * 这是一层纯静态布局，没有交互，因此保持服务端组件 —— 表单本身才需要 "use client"。
 */
export function AuthShell({ brand, cardWidth = 420, children }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:h-screen lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:overflow-hidden">
      {/* ── 品牌侧（lg 以上才出现）── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-jade-50 px-12 py-14 lg:flex lg:min-h-0 xl:px-16">
        {/* 两个极轻的玉青色块制造呼吸感；浅色主题下不使用模糊玻璃 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-24 size-[340px] rounded-full bg-jade-100"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 size-[300px] rounded-full bg-jade-100"
        />

        <div className="relative flex items-center gap-3">
          <BrandMark text={brand.mark} />
          <span className="font-display text-h2 text-jade-900">{brand.name}</span>
        </div>

        <div className="relative max-w-[430px]">
          <h2 className="font-display text-display text-jade-900">{brand.slogan}</h2>
          <ul className="mt-9 flex flex-col gap-4">
            {brand.points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-body text-ink-700">
                <CheckMark />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-cap text-ink-500">{brand.copyright}</p>
      </aside>

      {/* ── 表单侧 ── */}
      <main className="flex justify-center bg-paper px-5 py-10 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:py-8">
        <div className="my-auto w-full" style={{ maxWidth: cardWidth }}>
          {/* 移动端省略了左侧品牌区，这里补一行精简品牌 */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <BrandMark text={brand.mark} size={36} />
            <span className="font-display text-h3 text-jade-900">{brand.name}</span>
          </div>

          <div className="rounded-lg border border-ink-200 bg-surface p-6 shadow-1 sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
