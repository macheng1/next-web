"use client";

import { Modal as SemiModal } from "@douyinfe/semi-ui-19";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/src/components/Button";
import { cx } from "@/src/lib/cx";

export interface ModalProps {
  open: boolean;
  /** 关闭回调。默认只由 `ModalActions` 触发，不使用 × 按钮 */
  onClose: () => void;
  /** 标题。可传任意节点（如带单位、带小徽标） */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** 标题上方图标 */
  icon?: ReactNode;
  children?: ReactNode;
  /** 底部按钮区，建议使用 `<ModalActions />` */
  footer?: ReactNode;
  /** 宽度 px，默认 330 */
  width?: number;
  /**
   * 是否允许点遮罩 / 按 ESC 关闭，默认 `false`。
   * 隐私授权类弹窗必须保持 false —— 规范要求「无 × 按钮，必须二选一」。
   */
  dismissOnVeil?: boolean;
  /** 挂在 `.semi-modal` 上的类名 */
  className?: string;
  /** 挂在内容层（`.semi-modal-content`）上的类名，会覆盖宽度等几何 */
  contentClassName?: string;
  /** 内容层样式 */
  contentStyle?: CSSProperties;
}

/**
 * 弹窗 Modal · 规范 §07 组件库 —— 基于 Semi `Modal` 封装
 *
 * 分工原则：**纯告知或确认**的浮层走居中弹窗；**需要输入**的走底部半屏（`Sheet`）——
 * 键盘顶起不遮挡、拇指够得到。
 *
 * - 宽度默认 `330px`（可传 `width` 覆盖），左右各留 24px 安全边距由 Semi 负责。
 * - 遮罩统一 `rgba(8,40,36,.44)`，**不叠加模糊**，保持浅色主题的通透感。
 * - **关闭无 × 按钮，必须二选一**（`closable={false}`）；退路写在正文里（`subtitle` / `children`）。
 * - 按钮区各占 50%、同为 47px 高，视觉等权（见 `ModalActions`）。
 * - 焦点与滚动交给 Semi：打开时焦点移入弹窗、关闭后归还触发元素、Tab 不逃逸背景、
 *   背景滚动锁定 —— 不再需要自研 focus trap。
 *
 * 灵活位：`width` / `contentClassName` 改几何，`icon` 加标题图标，
 * `title` / `subtitle` / `children` / `footer` 任意节点，四个区块都可以只给一部分。
 * 不开放的是 `closable` —— 这条是合规红线，不是可配项。
 *
 * 合规红线（规范 §07，不可协商）：
 * ① 拒绝授权与同意授权的按钮必须等宽等高、同样的视觉可发现性，禁止缩小、置灰或改文案为「稍后再说」；
 * ② 隐私弹窗的告知项要逐条列出信息类型与用途，不用「可能收集相关信息」这类笼统表述；
 * ③ 必须先弹窗再调用隐私接口，不允许先调用后追授权；
 * ④ 用户撤回授权后，功能降级要给出明确说明，而不是静默失败。
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  width = 330,
  dismissOnVeil = false,
  className,
  contentClassName,
  contentStyle,
}: ModalProps) {
  return (
    <SemiModal
      visible={open}
      onCancel={onClose}
      title={
        title ? (
          <span className="flex flex-col items-center gap-2.5">
            {icon && <span className="text-[22px] leading-none">{icon}</span>}
            <span>{title}</span>
          </span>
        ) : null
      }
      centered
      width={width}
      closable={false}
      maskClosable={dismissOnVeil}
      closeOnEsc={dismissOnVeil}
      // 显式传 footer：Semi 用「props 里是否存在 footer 键」来决定
      // 走自定义底栏还是默认「取消 / 确定」，传 undefined 即渲染空底栏。
      footer={footer}
      className={cx("shhy-modal", className)}
      modalContentClass={cx("shhy-modal-content", contentClassName)}
      // Semi 把 style 透传到内容层
      style={contentStyle}
    >
      {subtitle && (
        <p className="mt-[7px] text-center text-[11.5px] leading-[1.7] text-ink-500">
          {subtitle}
        </p>
      )}
      {children}
    </SemiModal>
  );
}

export interface ModalActionsProps {
  cancelText?: ReactNode;
  confirmText?: ReactNode;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmLoading?: boolean;
  className?: string;
}

/**
 * 弹窗底部按钮区 —— 拒绝 / 同意 各占 50%、同为 47px 高，**视觉等权**。
 *
 * 拒绝：`ink-600`（对比度 4.89:1，达 AA）；同意：`jade-700`（6.4:1）。
 * 两者都是无填充的文字按钮，不做「主按钮 vs 幽灵按钮」的权重区分 ——
 * 隐私授权场景下，降低拒绝按钮的可发现性属于合规问题。
 */
export function ModalActions({
  cancelText = "拒绝同意",
  confirmText = "同意",
  onCancel,
  onConfirm,
  confirmLoading,
  className,
}: ModalActionsProps) {
  return (
    <div className={cx("shhy-modal-actions", className)}>
      <Button
        variant="ghost"
        className="shhy-modal-action shhy-modal-action--cancel"
        onClick={onCancel}
      >
        {cancelText}
      </Button>
      <Button
        variant="ghost"
        className="shhy-modal-action shhy-modal-action--confirm"
        loading={confirmLoading}
        onClick={onConfirm ?? onCancel}
      >
        {confirmText}
      </Button>
    </div>
  );
}

export interface ModalListItem {
  title: string;
  desc: string;
}

/**
 * 隐私告知清单 —— 逐条列出「信息类型 + 用途」。
 * 对应红线 ②：禁止「可能收集相关信息」这类笼统表述。
 *
 * 这一块是规范自定的诉述型结构（编号 + 信息类型 + 用途），
 * Semi 没有对应语义的原语，硬套 `List` 反而会多一层无意义容器，故保留原生标记。
 */
export function ModalList({ items }: { items: ModalListItem[] }) {
  return (
    <div className="mt-3.5 rounded-md border border-ink-100 bg-ink-50 p-3">
      {items.map((item, index) => (
        <div
          key={item.title}
          className={cx(
            "flex gap-[9px] text-[11.5px] leading-[1.6] text-ink-600",
            index > 0 && "mt-[9px]",
          )}
        >
          <i
            aria-hidden="true"
            className="grid size-[18px] shrink-0 place-items-center rounded-[6px] bg-jade-100 font-mono text-[9px] font-bold not-italic text-jade-800"
          >
            {index + 1}
          </i>
          <span>
            <b className="font-semibold text-ink-900">{item.title}</b>
            {" · "}
            {item.desc}
          </span>
        </div>
      ))}
    </div>
  );
}
