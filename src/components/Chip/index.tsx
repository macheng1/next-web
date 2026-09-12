"use client";

import { Tag as SemiTag } from "@douyinfe/semi-ui-19";
import type { CSSProperties, ComponentProps, ReactNode } from "react";
import { cx } from "@/src/lib/cx";

type SemiTagProps = ComponentProps<typeof SemiTag>;

export type ChipSize = "md" | "touch" | number;

/**
 * 自定义配色。三个维度都可选，没传的沿用默认
 * （变量回落写在 semi-theme.css 里），不会出现半截色。
 */
export interface ChipTone {
  bg?: string;
  fg?: string;
  border?: string;
}

export interface ChipProps
  extends Omit<
    SemiTagProps,
    | "children"
    | "onClose"
    | "closable"
    | "visible"
    | "type"
    | "color"
    | "size"
    | "shape"
    | "className"
    | "prefixIcon"
  > {
  /** 选中态，映射到 aria-pressed */
  pressed?: boolean;
  /** 点击右侧 × 时回调；传入即显示关闭区 */
  onDismiss?: () => void;
  /**
   * ⚠️ 规范自相矛盾待确认：§07 的 `.chip` 最小高度 36px，§10 又要求交互元素 ≥46×46px。
   * `md` = 36px（按 CSS 实现值）；`touch` = 46px（纯触屏场景）；传数字则自定义高度。
   */
  size?: ChipSize;
  /** 禁用态：不可点、不可关闭 */
  disabled?: boolean;
  /** 前置图标，如筛选图标或状态点 */
  icon?: ReactNode;
  /** 自定义配色；选中态也走同一组颜色，不再叠加玉青 */
  tone?: ChipTone;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * 筛选 Chips · 规范 §07 组件库 —— 基于 Semi `Tag` 封装
 *
 * - 胶囊形（`--r-pill`），静置为 `surface` 底 + `ink-200` 描边 + 13px `ink-700`。
 * - 选中态：`jade-50` 底 + `jade-300` 描边 + `jade-800` 600 字。
 * - 关闭区 × 由 Semi 的 `closable` 渲染（自带 IconClose 与点击隔离），不再手写「×」。
 *
 * 灵活位：`size` 支持数字、`disabled` 禁用、`icon` 前置图标、`tone` 自定义配色。
 *
 * 无障碍说明：Semi 的 Tag 根节点是 `div`，这里补上 `role="button"` + `tabIndex`
 * + `aria-pressed`，并自行处理 Enter / Space —— 三者都由 Semi 原样透传到根节点。
 * 颜色不交给 Tailwind 工具类：Semi 的组件样式未分层，会压过 `@layer utilities`。
 */
export function Chip({
  pressed = false,
  onDismiss,
  size = "md",
  disabled = false,
  icon,
  tone,
  children,
  className,
  style,
  onClick,
  onKeyDown,
  ...rest
}: ChipProps) {
  // Semi 的 Tag 在没收到 aria-label 时会自动拼一个「Tag: xxx」，
  // 纯文字 chip 直接用文案本身当可访问名称更干净。
  const ariaLabel =
    rest["aria-label"] ?? (typeof children === "string" ? children : undefined);

  const customSize = typeof size === "number";
  const sizeStyle: CSSProperties | undefined = customSize
    ? { height: size, paddingInline: Math.round(size * 0.39) }
    : undefined;

  const toneStyle = tone
    ? ({
        "--shhy-chip-bg": tone.bg,
        "--shhy-chip-fg": tone.fg,
        "--shhy-chip-border": tone.border,
      } as CSSProperties)
    : undefined;

  return (
    <SemiTag
      {...rest}
      aria-label={ariaLabel}
      closable={Boolean(onDismiss) && !disabled}
      onClose={() => onDismiss?.()}
      prefixIcon={icon}
      onClick={disabled ? undefined : onClick}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      data-tone={tone ? "custom" : undefined}
      className={cx(
        "shhy-chip",
        size === "touch" && "shhy-chip--touch",
        pressed && "shhy-chip--pressed",
        disabled && "shhy-chip--disabled",
        className,
      )}
      style={{ ...sizeStyle, ...toneStyle, ...style }}
      // role / aria-* 不在 Semi TagProps 的类型里，但 Semi 会把未知属性
      // 原样摊到根节点（tag/index.js 的 __rest + Object.assign），故此处断言透传。
      {...({
        role: "button",
        "aria-pressed": pressed,
        "aria-disabled": disabled || undefined,
      } as unknown as SemiTagProps)}
    >
      {children}
    </SemiTag>
  );
}
