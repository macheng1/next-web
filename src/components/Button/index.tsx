"use client";

import { Button as SemiButton } from "@douyinfe/semi-ui-19";
import type { CSSProperties, ComponentProps } from "react";
import { cx } from "@/src/lib/cx";

/**
 * Semi 的组件是类组件，构造函数签名是 `constructor(props?: P)`，
 * 直接 `ComponentProps` 会推出 `P | undefined`，必须用 `NonNullable` 收掉。
 */
type SemiButtonProps = NonNullable<ComponentProps<typeof SemiButton>>;

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "lg" | "md" | "sm";

/**
 * 自定义配色。三个维度都是可选的，没传的沿用 `variant` 默认值
 * （变量回落写在 semi-theme.css 各 variant 块里），所以不会出现半截色。
 */
export interface ButtonTone {
  /** 底色 */
  bg?: string;
  /** 文字色 */
  fg?: string;
  /** 描边色 */
  border?: string;
}

export interface ButtonProps
  extends Omit<SemiButtonProps, "theme" | "type" | "size"> {
  /** 视觉层级，见规范 §07。`danger` 为破坏性动作（删除 / 解绑） */
  variant?: ButtonVariant;
  /**
   * 尺寸档位，或直接给高度（px）。
   * - `lg` 48px（表单提交）｜ `md` 46px（默认，触达下限）｜ `sm` 34px（仅鼠标/密集场景）
   * - 传数字时按高度等比推导内边距（0.48 × 高度），字号在 ≤38px 时用 `--text-sub`
   */
  size?: ButtonSize | number;
  /** 自定义配色，hover / active 由底色自动变暗，不会丢按压反馈 */
  tone?: ButtonTone;
  /** 自定义圆角，如 `999` 做胶囊按钮 */
  radius?: number | string;
}

/**
 * 变体 → Semi 的 `theme`（描边/填充方式）+ `type`（配色语义）。
 * 配色本身由 src/styles/semi-theme.css 把 `--semi-color-primary*` 桥接到玉青完成，
 * 这里只负责「形态」映射，不重复写颜色。
 */
const VARIANT_MAP: Record<
  ButtonVariant,
  { theme: NonNullable<SemiButtonProps["theme"]>; type: NonNullable<SemiButtonProps["type"]> }
> = {
  primary: { theme: "solid", type: "primary" },
  secondary: { theme: "light", type: "primary" },
  outline: { theme: "outline", type: "tertiary" },
  ghost: { theme: "borderless", type: "primary" },
  danger: { theme: "solid", type: "danger" },
};

/** 商汇档位 → Semi 尺寸档，真实高度由 semi-theme.css 统一改写为 48 / 46 / 34px */
const SIZE_MAP: Record<ButtonSize, NonNullable<SemiButtonProps["size"]>> = {
  lg: "large",
  md: "default",
  sm: "small",
};

/**
 * 按钮 Button · 规范 §07 组件库 —— 基于 Semi `Button` 封装
 *
 * 默认形态（不传任何覆盖时就是规范本身）：
 * - **主按钮 Primary**（`theme="solid"`）：玉青 600 底 + 白字 + 玉青投影。**每屏只允许一个**。
 *   高度 46px，表单提交 48px（`size="lg"`）。实底用 jade-600 而非 500 ——
 *   500 配白字仅 3.9:1 未达 AA，600 达 5.63:1。
 * - **次级按钮 Secondary**（`theme="light"`）：玉青 50 底 + 玉青 800 字 + 玉青 200 描边。
 * - **描边按钮 Outline**（`theme="outline"`）：白底 + 墨青描边，用于「保存草稿」类非提交动作。
 * - **幽灵按钮 Ghost**（`theme="borderless"`）：透明底 + 玉青 700 字，最低视觉权重。
 * - **危险按钮 Danger**：朱砂实底、不投影 —— 破坏性动作不该比主操作更突出。
 * - 按压只变色、不做缩放（§09：140ms / ease-out）；禁用态 opacity .45 并去投影。
 *
 * 灵活位（都是可选覆盖，不传即规范值）：
 * - `size` 传数字 → 自定义高度；
 * - `radius` → 自定义圆角（胶囊按钮等）；
 * - `tone` → 换底色 / 字色 / 描边色（规范色之外的场景，如第三方品牌色）。
 *
 * 由 Semi 接管的部分：图标排布、`loading` 转圈、`block`、`disabled`、
 * 键盘可达性与 `htmlType`。注意 HTML 的按钮类型走 **`htmlType`**，
 * 本组件的 `type` 已被占用为「视觉层级」以外的 Semi 配色语义，不再暴露。
 */
export function Button({
  variant = "primary",
  size = "md",
  tone,
  radius,
  className,
  style,
  ...rest
}: ButtonProps) {
  const { theme, type } = VARIANT_MAP[variant];
  const customSize = typeof size === "number";

  const sizeStyle: CSSProperties | undefined = customSize
    ? {
        height: size,
        paddingInline: Math.round(size * 0.48),
        fontSize: size <= 38 ? "var(--text-sub)" : "var(--text-body)",
      }
    : undefined;

  const toneStyle = tone
    ? ({
        "--shhy-btn-bg": tone.bg,
        "--shhy-btn-fg": tone.fg,
        "--shhy-btn-border": tone.border,
      } as CSSProperties)
    : undefined;

  const radiusStyle =
    radius === undefined
      ? undefined
      : ({
          "--shhy-btn-radius": typeof radius === "number" ? `${radius}px` : radius,
        } as CSSProperties);

  return (
    <SemiButton
      theme={theme}
      type={type}
      size={SIZE_MAP[customSize ? "md" : size]}
      data-tone={tone ? "custom" : undefined}
      className={cx(
        "shhy-btn",
        `shhy-btn--${variant}`,
        `shhy-btn--${customSize ? "md" : size}`,
        className,
      )}
      // 顺序即优先级：几何 → 圆角 → 配色 → 调用方 style（最后写，最容易赢）
      style={{ ...sizeStyle, ...radiusStyle, ...toneStyle, ...style }}
      {...rest}
    />
  );
}
