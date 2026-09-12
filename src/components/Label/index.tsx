"use client";

import { Tag as SemiTag } from "@douyinfe/semi-ui-19";
import type { CSSProperties, ComponentProps, ReactNode } from "react";
import { cx } from "@/src/lib/cx";

type SemiTagProps = ComponentProps<typeof SemiTag>;

/** 规范定义的六种语义色 */
export type LabelTone = "cred" | "buy" | "bid" | "join" | "new" | "plain";

/** 超出规范色板时，直接给底 / 字两色（如租户品牌色） */
export interface LabelCustomTone {
  bg: string;
  fg: string;
}

export type LabelSize = "md" | "lg" | number;

export interface LabelProps
  extends Omit<
    SemiTagProps,
    | "children"
    | "closable"
    | "onClose"
    | "visible"
    | "className"
    | "color"
    | "size"
    | "prefixIcon"
  > {
  tone?: LabelTone | LabelCustomTone;
  /** 前置图标，如认证的小盾牌 */
  icon?: ReactNode;
  /** 尺寸：`md` 11px（默认）｜ `lg` 13px ｜ 数字 = 字号 px */
  size?: LabelSize;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * 标签 Label · 规范 §07 组件库 —— 基于 Semi `Tag` 封装
 *
 * | tone | 场景 | 底 / 字 |
 * | --- | --- | --- |
 * | `cred` | 工商实名认证 | success-bg / success |
 * | `buy` | 采购需求 | warning-bg / signal-buy（琥珀） |
 * | `bid` | 招标公告 | info-bg / signal-bid（靛蓝） |
 * | `join` | 招商加盟 | signal-join-bg / signal-join（藤紫） |
 * | `new` | 新发布 / 剩 N 天 | error-bg / signal-new（朱砂） |
 * | `plain` | 高新技术企业等中性属性 | ink-100 / ink-600 |
 *
 * 约束：
 * - 圆角 `--r-xs`（4px），11px / 600，内边距 2.5px 8px —— 几何在 semi-theme.css 里。
 * - **色盲安全**：四类信号色不以颜色单独承载语义，标签内必须带文字（规范 §02）。
 * - **标签不可点**（§09 触达区规范）：不传任何点击回调，Semi 的 `closable` 也被摘掉。
 *
 * 灵活位：`tone` 可传 `{ bg, fg }` 自定义配色、`icon` 前置图标、`size` 三档或自定义字号。
 *
 * 配色用内联样式而非 Tailwind 工具类：Semi 组件样式未分层，会压过 `@layer utilities`；
 * 标签是静态的、没有 hover 态，内联样式不会与交互样式打架，是最稳的一档。
 * 也不使用 Semi 的 `color` 调色板 —— 它没有玉青这一档，硬套会串色。
 */
const TONE_STYLE: Record<LabelTone, LabelCustomTone> = {
  cred: { bg: "var(--success-bg)", fg: "var(--success)" },
  buy: { bg: "var(--warning-bg)", fg: "var(--signal-buy)" },
  bid: { bg: "var(--info-bg)", fg: "var(--signal-bid)" },
  join: { bg: "var(--signal-join-bg)", fg: "var(--signal-join)" },
  new: { bg: "var(--error-bg)", fg: "var(--signal-new)" },
  plain: { bg: "var(--ink-100)", fg: "var(--ink-600)" },
};

function isCustomTone(tone: LabelProps["tone"]): tone is LabelCustomTone {
  return typeof tone === "object" && tone !== null && "bg" in tone;
}

/** 尺寸：`md` 用规范默认（在 CSS 里），其余档位把字号与内边距按比例一起放大 */
function resolveSizeStyle(size: LabelSize): CSSProperties | undefined {
  if (size === "md") return undefined;

  const fontSize = size === "lg" ? 13 : size;
  return {
    fontSize,
    padding: `${Math.round(fontSize * 0.23)}px ${Math.round(fontSize * 0.73)}px`,
    lineHeight: `${Math.round(fontSize * 1.45)}px`,
  };
}

export function Label({
  tone = "plain",
  icon,
  size = "md",
  children,
  className,
  style,
}: LabelProps) {
  const colors = isCustomTone(tone) ? tone : TONE_STYLE[tone];
  const toneName = isCustomTone(tone) ? "custom" : tone;

  return (
    <SemiTag
      data-tone={toneName}
      prefixIcon={icon}
      className={cx("shhy-label", `lbl lbl--${toneName}`, className)}
      style={{ background: colors.bg, color: colors.fg, ...resolveSizeStyle(size), ...style }}
    >
      {children}
    </SemiTag>
  );
}
