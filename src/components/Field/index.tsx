"use client";

import { Input as SemiInput, TextArea as SemiTextArea } from "@douyinfe/semi-ui-19";
import { createContext, useContext, useId } from "react";
import type { ChangeEvent, ComponentProps, CSSProperties, ReactNode } from "react";
import { cx } from "@/src/lib/cx";

type SemiInputProps = ComponentProps<typeof SemiInput>;
type SemiTextAreaProps = ComponentProps<typeof SemiTextArea>;

/** 字段内部的无障碍关联信息，供自定义控件取用 */
export interface FieldA11y {
  /** hint / error 的 id，直接挂到 aria-describedby */
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

const FieldA11yContext = createContext<FieldA11y>({
  invalid: false,
  required: false,
});

/**
 * 取当前字段的无障碍关联信息。
 * 在 `<FieldShell>` 内部的自定义控件里调用，就能自动接上
 * `aria-describedby` / `aria-invalid`，不必把 id 命名约定散落到调用方。
 *
 * ```tsx
 * <FieldShell id="city" label="城市" error={err}>
 *   <MySelect {...useFieldA11y()} />
 * </FieldShell>
 * ```
 */
export function useFieldA11y(): FieldA11y {
  return useContext(FieldA11yContext);
}

/**
 * 由 `id` / `hint` / `error` 派生一组稳定 id。
 * FieldShell 与内置控件各算一遍，因为入参相同，结果必然一致 ——
 * 这样两者不需要通过 context 互相等待。
 */
function useFieldMeta(id: string | undefined, hint: ReactNode, error: string | undefined) {
  const autoId = useId();
  const fieldId = id ?? `field-${autoId}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return {
    fieldId,
    hintId,
    errorId,
    // 错误与 hint 在 FieldShell 里只渲染其一，所以只关联当前真实存在的那一个 ——
    // 两者都塞进去会在错误态留下一个指向不存在节点的 idref。
    describedBy: errorId ?? hintId,
  };
}

function ErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0 fill-none stroke-current"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2.5 14.5 13.5H1.5L8 2.5Z" />
      <path d="M8 6.5v3" />
      <path d="M8 11.5h.01" />
    </svg>
  );
}

export interface FieldShellProps {
  id?: string;
  /** 不传则只渲染控件，不占 label 行 */
  label?: ReactNode;
  /** label 行右侧附加内容（「忘记密码」链接、计数提示等） */
  labelExtra?: ReactNode;
  hint?: ReactNode;
  /** 错误信息。规范 §10：错误色 + 图标 + 文案三重提示，绝不仅靠红色 */
  error?: string;
  required?: boolean;
  className?: string;
  style?: CSSProperties;
  /** 控件本体。可以是内置 `<Field>`，也可以是下拉框 / 日期选择 / 完全自定义的控件 */
  children: ReactNode;
}

/**
 * 字段外壳 FieldShell · 规范 §07 组件库
 *
 * 拆出这一层的意义：`<Field>` 只覆盖「单行 / 多行文本框」，
 * 而真实表单里还有下拉框、日期选择、上传、组合控件 ——
 * 它们需要与输入框**完全相同**的 label / hint / 错误提示 / 间距。
 * 这一层只负责这套外壳与无障碍关联，控件本体由调用方通过 children 决定。
 *
 * - 外壳用 Tailwind 工具类：这里没有 Semi 组件，工具类正常生效。
 * - `hint` / `error` 同时被 `aria-describedby` 关联（经 `useFieldA11y()` 取用），
 *   读屏时错误信息不会被漏掉。
 * - 规范 §10：错误态是「错误色 + 图标 + 文案」三重提示，不是只把边框描红。
 */
export function FieldShell({
  id,
  label,
  labelExtra,
  hint,
  error,
  required = false,
  className,
  style,
  children,
}: FieldShellProps) {
  const { fieldId, hintId, errorId, describedBy } = useFieldMeta(id, hint, error);

  return (
    <FieldA11yContext.Provider value={{ describedBy, invalid: Boolean(error), required }}>
      <div className={cx("shhy-field flex flex-col gap-[7px]", className)} style={style}>
        {(label || labelExtra) && (
          <div className="flex items-center justify-between gap-2">
            {label ? (
              <label htmlFor={fieldId} className="text-[12.5px] font-semibold text-ink-700">
                {label}
                {required && (
                  <span aria-hidden="true" className="ml-0.5 text-error">
                    *
                  </span>
                )}
              </label>
            ) : (
              <span />
            )}
            {labelExtra}
          </div>
        )}

        {children}

        {error ? (
          <p
            id={errorId}
            className="flex items-center gap-1 text-[11.5px] text-error"
          >
            <ErrorIcon />
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-[11.5px] text-ink-500">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldA11yContext.Provider>
  );
}

export interface FieldProps
  extends Omit<
    SemiInputProps,
    "onChange" | "size" | "className" | "validateStatus" | "children"
  > {
  /** 不传会自动生成（useId），与 label 的 htmlFor 自动配对 */
  id?: string;
  /** 不传则只渲染控件 */
  label?: ReactNode;
  /** label 行右侧附加内容 */
  labelExtra?: ReactNode;
  /** 辅助说明，如「与营业执照一致，便于资质核验」 */
  hint?: ReactNode;
  /** 错误信息。规范 §10：错误色 + 图标 + 文案三重提示，绝不仅靠红色 */
  error?: string;
  /** 容器类名（Semi 的 className 落在输入框上，这里改挂在外层字段容器） */
  className?: string;
  /** 容器样式 */
  style?: CSSProperties;
  /** 多行文本框（走 Semi `TextArea`，视觉与单行一致，见 semi-theme.css） */
  multiline?: boolean;
  /** 多行时的默认行数，默认 3 */
  rows?: number;
  /** 多行时显示字数统计（配合 maxLength） */
  showCounter?: boolean;
  /** 保留原生事件签名，避免调用方被 Semi 的 `(value, event)` 签名绑住 */
  onChange?: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** 只回传值，省掉 `event.currentTarget.value` 这一步 */
  onValueChange?: (value: string) => void;
  /** 传了就完全接管控件渲染，内置输入框不渲染（等价于在 FieldShell 里放自己的控件） */
  children?: ReactNode;
}

/**
 * 表单输入 Field · 规范 §07 组件库 —— 基于 Semi `Input` / `TextArea` 封装
 *
 * - 输入底 `ink-50`，1px `ink-100` 描边，高度 46px，圆角 `--r-md`。
 *   底与描边取 CSS 实现值而非 `surface-sunken`：占位符 `ink-500` on `ink-50` 实测 4.51:1（AA）。
 * - 聚焦：描边转 `jade-400`、底转 `surface`、外扩 3px `jade-50` 光晕 —— 由 Semi 的
 *   `semi-input-wrapper-focus` 钩子在 semi-theme.css 里改写，不用自己维护 focus 状态。
 * - label 12.5px/600 `ink-700`；hint 11.5px `ink-500`。
 * - 错误态走 Semi 的 `validateStatus="error"`：错误色 + 图标 + 文案三重提示，红边框只是其中一项。
 * - `multiline` 走 Semi `TextArea`，但视觉被改写为与单行**完全一致**
 *   （同一套底 / 描边 / 聚焦光晕），避免一个表单里出现两种输入风格。
 *
 * 灵活位：`id` / `label` 可省略、`labelExtra` 挂在 label 行右侧、
 * `onValueChange` 只回传值、`children` 可整体替换控件。
 * 需要「非文本框」的控件时用 `<FieldShell>`，外壳与无障碍关联完全一致。
 *
 * 由 Semi 接管的部分：受控/非受控取值、`showClear`、`prefix`/`suffix`、
 * `mode="password"` 的明文切换、`autosize`、`onEnterPress`、无障碍属性透传到原生控件。
 */
export function Field({
  id,
  label,
  labelExtra,
  hint,
  error,
  required,
  multiline = false,
  rows = 3,
  showCounter,
  className,
  style,
  children,
  onChange,
  onValueChange,
  ...rest
}: FieldProps) {
  const { fieldId, describedBy } = useFieldMeta(id, hint, error);

  return (
    <FieldShell
      id={fieldId}
      label={label}
      labelExtra={labelExtra}
      hint={hint}
      error={error}
      required={required}
      className={className}
      style={style}
    >
      {children ??
        (multiline ? (
          <SemiTextArea
            {...(rest as unknown as SemiTextAreaProps)}
            id={fieldId}
            rows={rows}
            showCounter={showCounter}
            validateStatus={error ? "error" : "default"}
            aria-invalid={error ? true : undefined}
            aria-required={required || undefined}
            aria-describedby={describedBy}
            onChange={(value, event) => {
              onChange?.(event as unknown as ChangeEvent<HTMLTextAreaElement>);
              onValueChange?.(value);
            }}
          />
        ) : (
          <SemiInput
            {...rest}
            id={fieldId}
            validateStatus={error ? "error" : "default"}
            aria-invalid={error ? true : undefined}
            aria-required={required || undefined}
            aria-describedby={describedBy}
            onChange={(value, event) => {
              onChange?.(event as unknown as ChangeEvent<HTMLInputElement>);
              onValueChange?.(value);
            }}
          />
        ))}
    </FieldShell>
  );
}
