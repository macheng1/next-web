"use client";

import { Avatar as SemiAvatar } from "@douyinfe/semi-ui-19";
import type { CSSProperties, ComponentProps, ReactNode } from "react";
import { cx } from "@/src/lib/cx";

type SemiAvatarProps = ComponentProps<typeof SemiAvatar>;

export type AvatarRounded = "md" | "xl" | "full" | number;

export interface AvatarProps
  extends Omit<
    SemiAvatarProps,
    | "children"
    | "size"
    | "shape"
    | "color"
    | "hoverMask"
    | "className"
    // Semi 的 border 是 `boolean | { color, motion }`，语义与这里的简写不同，改用自定义的 border
    | "border"
  > {
  /** 取字（企业简称首字 / 用户姓氏）。无 `src` 时生效，也可省略改用 `children` */
  text?: string;
  /** 图片地址；传了就用图片，取字自动退居兜底 */
  src?: string;
  /** 图片替代文字。`decorative={false}` 时才会被读屏播报 */
  alt?: string;
  /** 边长 px，规范出现的档位：64（弹窗头像）/ 50（企业卡片 Logo） */
  size?: number;
  /** 圆角档位，或直接给像素值 */
  rounded?: AvatarRounded;
  /**
   * 装饰性，默认 `true` → 整个头像 `aria-hidden`。
   * 适用场景：头像紧跟着企业名 / 用户名，读屏已播报过内容，再读一遍取字是噪音。
   * 纯图片头像（周围没有同名文字）应传 `false`，否则 `alt` 会被吞掉。
   */
  decorative?: boolean;
  /** 自定义底色（取字态生效），如换成租户品牌色 */
  bg?: string;
  /** 自定义字色（取字态生效） */
  fg?: string;
  /** 描边色；传 `false` 去掉描边 */
  border?: string | false;
  className?: string;
  style?: CSSProperties;
  /** 完全接管内容（如自定义图标、状态点） */
  children?: ReactNode;
}

function resolveRadius(rounded: AvatarRounded): string | number {
  if (typeof rounded === "number") return rounded;
  if (rounded === "full") return "var(--r-pill)";
  if (rounded === "xl") return "var(--r-xl)";
  return "var(--r-md)";
}

/**
 * 头像 / Logo 方块 Avatar · 规范 §05「Logo / 头像处理（v2 变更）」—— 基于 Semi `Avatar` 封装
 *
 * **统一底色**：浅玉青渐变 `jade-100 → jade-200` + 深玉青字 `jade-900` + 1px `jade-200` 描边。
 *
 * 为什么改：原深色渐变方块（jade-600 → ink-800）在大量浅色卡片中形成密集深色点，
 * 是「视觉过重」的主要来源。
 *
 * 为什么三者共用同一套处理：「我的」页头像、修改弹窗头像、企业 Logo 方块三者尺寸不同，
 * 但形状与配色完全一致（圆角方 + 浅玉青底 + 深玉青字）。用户在弹窗里看到的头像和列表里
 * 是同一张，不会产生「换个地方就换了个身份」的错觉。
 *
 * 灵活位：
 * - `src` 传图片（Semi 负责渲染 `<img>`，失败的 `onError` 也可透传）；
 * - `rounded` 支持数字、`size` 任意边长；
 * - `bg` / `fg` / `border` 换配色（如租户品牌色）；
 * - `children` 完全接管内容；`decorative` 控制是否对读屏隐藏。
 *
 * Semi 的 `size` 是 7 档字符串枚举（20–64px），规范只需要 50 / 64 两档，
 * 因此尺寸与圆角用内联样式直出，不套 Semi 的档位类。
 */
export function Avatar({
  text,
  src,
  alt,
  size = 50,
  rounded,
  decorative = true,
  bg,
  fg,
  border,
  className,
  style,
  children,
  ...rest
}: AvatarProps) {
  const resolvedRounded = rounded ?? (size >= 64 ? "xl" : "md");

  return (
    <SemiAvatar
      {...rest}
      src={src}
      alt={alt}
      className={cx("shhy-avatar", className)}
      style={{
        width: size,
        height: size,
        borderRadius: resolveRadius(resolvedRounded),
        fontSize: Math.round(size * 0.44),
        // 自定义底色时去掉渐变，否则渐变会盖住纯色
        ...(bg ? { backgroundImage: "none", backgroundColor: bg } : {}),
        ...(fg ? { color: fg } : {}),
        ...(border === false
          ? { border: "none" }
          : typeof border === "string"
            ? { borderColor: border }
            : {}),
        ...style,
      }}
      // 取字只是视觉占位，读屏时紧跟着企业名，默认避免重复播报
      {...((decorative ? { "aria-hidden": true } : {}) as unknown as SemiAvatarProps)}
    >
      {children ?? text}
    </SemiAvatar>
  );
}
