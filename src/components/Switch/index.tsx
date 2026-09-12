"use client";

import { Switch as SemiSwitch } from "@douyinfe/semi-ui-19";
import type { CSSProperties, ComponentProps, ReactNode } from "react";
import { cx } from "@/src/lib/cx";

type SemiSwitchProps = ComponentProps<typeof SemiSwitch>;

export type SwitchSize = "md" | number;

export interface SwitchProps
  extends Omit<
    SemiSwitchProps,
    | "onChange"
    | "size"
    | "checked"
    | "defaultChecked"
    | "checkedText"
    | "uncheckedText"
    | "className"
  > {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 可访问名称。有可见 `children` 文字时可省略，直接用文字当名称 */
  label?: string;
  /**
   * 锁定态：能力已存在但尚未满足条件（如未完成企业认证）。
   * 规范 §06 红线 —— 锁定态用降透明度 + 琥珀角标，**不用红色**，未完善不是错误。
   */
  locked?: boolean;
  /** 可见文字，渲染在开关旁并可点击切换 */
  children?: ReactNode;
  /** 文字位置，默认 `right` */
  labelPosition?: "left" | "right";
  /** 自定义开启色。默认取玉青 600（Semi 的 `--semi-color-success` 已桥接） */
  onColor?: string;
  /** 尺寸档位，或直接给宽度（px）。高度恒为 25px —— 开关是图形控件，只有宽高比需要对 */
  size?: SwitchSize;
  className?: string;
  style?: CSSProperties;
}

/**
 * 开关 Switch · 规范 §07 组件库（企业端高频）—— 基于 Semi `Switch` 封装
 *
 * - 尺寸 44 × 25px，滑块 20px，位移 19px；关闭 `ink-200`，开启 `jade-600`。
 * - 过渡 200ms / ease-out-quart，只做位移与底色，不加回弹。
 * - 锁定态：opacity 60% + 琥珀角标，禁止用红色表达。
 *
 * 灵活位：
 * - `children` 给可见文字（点击文字也能切换，命中区域比 44px 宽得多），
 *   不给则退化为纯图形开关，靠 `label` 提供可访问名称；
 * - `size` 传数字 → 自定义宽度，滑块位移自动按 `宽度 − 22.5px` 计算，任何宽度都贴边；
 * - `onColor` → 换开启色，如「停用」类开关用中性墨青而非玉青。
 *
 * 由 Semi 接管的部分：`role="switch"` 语义、隐藏的原生 checkbox（表单可提交）、
 * `loading`、键盘 Space/Enter 切换、focus-visible 处理。
 * 尺寸与配色在 semi-theme.css 里改写；注意 Semi 的开启态取的是
 * `--semi-color-success`，已在桥接层指向玉青，否则开关会是绿色。
 */
export function Switch({
  checked,
  onChange,
  label,
  locked = false,
  disabled,
  children,
  labelPosition = "right",
  onColor,
  size = "md",
  className,
  style,
  ...rest
}: SwitchProps) {
  const customSize = typeof size === "number";
  const isDisabled = Boolean(disabled || locked);
  const ariaLabel = label ?? (typeof children === "string" ? children : undefined);

  /** 宽度与开启色都靠 CSS 变量传给 semi-theme.css 消费 */
  const themedStyle = {
    ...(customSize ? { "--shhy-switch-w": `${size}px` } : {}),
    ...(onColor ? { "--shhy-switch-on": onColor } : {}),
  } as CSSProperties;

  const switchClassName = cx("shhy-switch", locked && "shhy-switch--locked");

  /** data-* 不在 Semi 的类型里，但 Semi 会把未知属性原样摊到根节点 */
  const dataAttrs = {
    "data-on-color": onColor ? "custom" : undefined,
    "data-size": customSize ? "custom" : undefined,
  } as unknown as SemiSwitchProps;

  const sharedProps = {
    ...rest,
    checked,
    disabled: isDisabled,
    "aria-label": ariaLabel,
    onChange: (next: boolean) => onChange(next),
    ...dataAttrs,
  };

  // 无可见文字：直接返回开关本身，className / style 落在开关上，保持单节点的布局语义
  if (!children) {
    return (
      <SemiSwitch
        {...sharedProps}
        className={cx(switchClassName, className)}
        style={{ ...themedStyle, ...style }}
      />
    );
  }

  const text = (
    <span
      className={cx("text-body text-ink-800", !isDisabled && "cursor-pointer select-none")}
      // 点击文字等价于切换：44px 的开关对触屏偏小，文字给了更大的命中区
      onClick={isDisabled ? undefined : () => onChange(!checked)}
    >
      {children}
    </span>
  );

  return (
    <span className={cx("inline-flex items-center gap-2.5", className)} style={style}>
      {labelPosition === "left" && text}
      <SemiSwitch {...sharedProps} className={switchClassName} style={themedStyle} />
      {labelPosition === "right" && text}
    </span>
  );
}
