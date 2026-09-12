"use client";

import { SideSheet as SemiSideSheet } from "@douyinfe/semi-ui-19";
import type { CSSProperties, ReactNode } from "react";
import { Button, type ButtonProps } from "@/src/components/Button";
import { cx } from "@/src/lib/cx";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** 标题，可传任意节点 */
  title?: ReactNode;
  children?: ReactNode;
  /** 底部按钮区，建议使用 `<SheetActions />` */
  footer?: ReactNode;
  /** 桌面端最大宽度 px，默认 560 */
  width?: number;
  /** 顶部拖拽条，默认显示。纯信息型半屏可以关掉 */
  showHandle?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * 底部半屏 Sheet · 规范 §07 组件库 —— 基于 Semi `SideSheet` 封装（`placement="bottom"`）
 *
 * 分工原则：**需要输入**的浮层走底部半屏 —— 键盘顶起不遮挡、拇指够得到；
 * 纯告知或确认的走居中 `Modal`。
 *
 * - 圆角仅顶部 22px（`--r-xl`），底部贴边不加圆角。
 * - 拖拽条 38 × 4px（Semi 没有这个装饰件，用 `::before` 画）；标题 16px/600 左对齐，
 *   右侧 28px 圆形关闭按钮（Semi 自带 `semi-sidesheet-close` 的 IconButton）。
 * - 遮罩统一 `rgba(8,40,36,.44)`，不叠加模糊。
 * - 焦点与滚动交给 Semi：打开时移入第一个可操作元素、关闭后归还触发元素、Tab 不逃逸背景。
 *
 * 灵活位：`width` 改桌面端最大宽度、`showHandle` 关掉拖拽条、
 * `title` / `children` / `footer` 可任意组合（标题也可以不给，只留关闭按钮）。
 *
 * Web 端适配：规范基于 375px，本组件在桌面端限制最大宽度（默认 560px）并底部居中，
 * 避免宽屏下「半屏」被拉成一条横带。
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  width = 560,
  showHandle = true,
  className,
  style,
}: SheetProps) {
  return (
    <SemiSideSheet
      visible={open}
      onCancel={onClose}
      title={title}
      placement="bottom"
      closable
      closeOnEsc
      // 与 Modal 一致：半屏必须由「取消 / 保存」二选一收场，不靠点遮罩误触关闭
      maskClosable={false}
      className={cx("shhy-sheet", className)}
      // 宽度与拖拽条都靠 CSS 变量传进 semi-theme.css，比 data 属性更可靠（Semi 不保证透传未知属性）
      style={
        {
          "--shhy-sheet-w": `${width}px`,
          ...(showHandle ? {} : { "--shhy-sheet-handle": "none" }),
          ...style,
        } as CSSProperties
      }
      footer={footer}
    >
      {children}
    </SemiSideSheet>
  );
}

export interface SheetActionsProps {
  cancelText?: ReactNode;
  confirmText?: ReactNode;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmLoading?: boolean;
  confirmProps?: ButtonProps;
}

/**
 * 半屏底部按钮区 —— 取消 : 保存 = 1 : 1.7。
 * 次级用 `outline`，主操作用实底 `primary`（表单提交 48px，见 §07）。
 */
export function SheetActions({
  cancelText = "取消",
  confirmText = "保存",
  onCancel,
  onConfirm,
  confirmLoading,
  confirmProps,
}: SheetActionsProps) {
  return (
    <div className="shhy-sheet-actions">
      <Button
        variant="outline"
        size="lg"
        className="shhy-sheet-action--cancel"
        onClick={onCancel}
      >
        {cancelText}
      </Button>
      <Button
        variant="primary"
        size="lg"
        className="shhy-sheet-action--confirm"
        loading={confirmLoading}
        onClick={onConfirm}
        {...confirmProps}
      >
        {confirmText}
      </Button>
    </div>
  );
}
