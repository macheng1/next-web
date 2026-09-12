"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, DragEvent, ReactNode } from "react";
import { Button } from "@/src/components/Button";
import { FieldShell, useFieldA11y } from "@/src/components/Field";
import { Modal } from "@/src/components/Modal";
import { cx } from "@/src/lib/cx";
import {
  MAX_UPLOAD_SIZE_MB,
  formatFileSize,
  isImageFile,
  isImageUrl,
  UPLOAD_ACCEPT,
} from "@/src/lib/upload-api";
import type { UploadedFile } from "@/src/lib/upload-api";

/**
 * 上传区 Uploader · 规范《商汇黄页-01-设计规范》v2.0 §06「企业端专属组件」
 *
 * 规范原文（§06 企业端专属组件）：
 * > **上传区 Uploader**：虚线玉青边 + 浅玉青底 + 图标 + 双行文案（动作 + 格式约束）。
 * > 用于营业执照与产品图。
 *
 * 落地要点：
 * - **外观**：`border-dashed` 玉青边 + `jade-50` 底 + 居中图标 + 双行文案
 *   （第一行动作 / 第二行格式约束），hover 与拖拽时边色加深。
 * - **外壳**：复用 `<FieldShell>`，所以 label / hint / 错误提示的间距、字号、字号
 *   与 `<Field>` 完全一致；错误态沿用规范 §10 的「错误色 + 图标 + 文案」三重提示。
 * - **触达**：整个虚线上传区就是一个 `<button>`（规范 §10 交互元素 ≥46px，实测约 120px），
 *   点击、键盘 Enter/Space、拖拽三条路径等价；不嵌套按钮，避免「点移除也触发选文件」。
 * - **无障碍**：`FieldShell` 的 label 通过 `htmlFor` 绑定到这个 button，
 *   `aria-describedby` 关联 hint/error（`useFieldA11y()` 由 context 提供）；
 *   原生 file input 只作为机械通道（`tabIndex={-1}` + `aria-hidden`），不占 tab 位；
 *   上传中 / 成功 / 失败经由 `role="status"` 的 live region 播报。
 * - **不耦合业务**：组件不知道传到哪里 —— 上传动作由调用方以 `upload` 注入
 *   （注册页传 `uploadWebFile`），文案全部 props 化并带中性默认值。
 * - **能看见自己传了什么**：图片上传成功后，区内图标位换成 48px 缩略图（右下角叠一枚
 *   成功勾），右侧多一个「预览」按钮打开大图（Modal）；非图片（PDF）走新窗口打开。
 *   缩略图优先用**本地 objectURL**（`URL.createObjectURL`），不依赖远端 CDN 回源，
 *   换文件 / 移除 / 卸载时 `revokeObjectURL` 释放，不会漏内存。
 */

/** 上传区状态：空 → 上传中 → 已上传；`dragging` 仅用于拖拽悬停时的视觉反馈 */
export type UploaderState = "idle" | "uploading" | "done" | "dragging";

export interface UploaderProps {
  /** 已上传成功的文件；`null` 表示还没有 */
  value: UploadedFile | null;
  /** 上传动作（注入式）。抛出的异常若带 `message`，会直接作为错误提示展示 */
  upload: (file: File) => Promise<UploadedFile>;
  onChange: (file: UploadedFile | null) => void;
  /** 上传开始 / 结束回调，供父表单在「上传中」禁用提交 */
  onUploadingChange?: (uploading: boolean) => void;

  /** 不传会自动生成（useId），与 label 的 htmlFor 自动配对 */
  id?: string;
  /** 不传则只渲染上传区，不占 label 行 */
  label?: ReactNode;
  /** 辅助说明，展示在**上传区下方**；格式约束请走 `constraintText`（规范要求写在区内第二行） */
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** 容器类名 */
  className?: string;
  /** 容器样式 */
  style?: CSSProperties;

  /** 允许的文件类型，透传给原生 file input 的 `accept` */
  accept?: string;
  /** 单文件上限（MB），默认与后端 §7.5a 一致（10MB）；仅用于文案与及时提示 */
  maxSizeMb?: number;
  /** 是否显示「移除」；默认 `true` */
  removable?: boolean;
  /** 是否提供预览（图片在弹窗里看大图，PDF 在新窗口打开）；默认 `true` */
  previewable?: boolean;

  /** 双行文案第一行：动作 */
  actionText?: string;
  /** 双行文案第二行：格式约束 */
  constraintText?: string;
  uploadingText?: string;
  /** 上传成功后第二行文案（第一行是已上传的文件名） */
  doneText?: string;
  removeText?: string;
  previewText?: string;
  previewTitle?: string;
  closeText?: string;
  /** 上传抛出的异常没有 message 时的兜底文案 */
  failedText?: string;
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-7 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15.5V4.5" />
      <path d="M7.5 9 12 4.5 16.5 9" />
      <path d="M4.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V15" />
    </svg>
  );
}

function DoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-7 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="M8.5 12.2 11 14.7l4.7-5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-7 shrink-0 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="8.25" opacity="0.25" />
      <path d="M20.25 12a8.25 8.25 0 0 0-8.25-8.25" />
    </svg>
  );
}

/**
 * 已上传图片的缩略图（48×48）。右下角叠一枚小勾，替代原来那个大对勾 ——
 * 「传成功了」和「传的是哪张」一眼同时看到。
 *
 * `alt=""` + `aria-hidden`：图片是装饰，文件名就在旁边文字里，读屏不该重复念一遍。
 */
function Thumbnail({ src }: { src: string }) {
  return (
    <span className="shhy-uploader__thumb relative block size-12 overflow-hidden rounded-[var(--r-sm)] border border-jade-200 bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="size-full object-cover"
      />
      <span
        aria-hidden="true"
        className="absolute right-0 bottom-0 grid size-[15px] place-items-center rounded-tl-[6px] bg-jade-700 text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[11px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.5 12.6 10 17l8.5-9.5" />
        </svg>
      </span>
    </span>
  );
}

export function Uploader({
  value,
  upload,
  onChange,
  onUploadingChange,
  id,
  label,
  hint,
  error,
  required = false,
  disabled = false,
  className,
  style,
  accept = UPLOAD_ACCEPT,
  maxSizeMb = MAX_UPLOAD_SIZE_MB,
  removable = true,
  actionText = "点击或拖拽文件到此处上传",
  constraintText = `支持 JPG / PNG / WebP / PDF，单文件不超过 ${maxSizeMb}MB`,
  uploadingText = "正在上传…",
  doneText = "已上传，点击可重新选择",
  removeText = "移除",
  previewable = true,
  previewText = "预览",
  previewTitle = "图片预览",
  closeText = "关闭",
  failedText = "文件上传失败，请稍后重试",
}: UploaderProps) {
  const autoId = useId();
  const zoneId = id ?? `uploader-${autoId}`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pendingName, setPendingName] = useState("");
  /** 本地错误（上传失败 / 响应异常）；`error` prop 优先级更高 */
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  /**
   * 刚上传成功那张图的本地地址。远端 URL 要等 CDN 回源，本地 objectURL 立刻就能显示，
   * 所以「预览」优先用它；换文件 / 移除 / 卸载时在下面统一释放。
   */
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  const shownError = error ?? localError ?? undefined;
  /** 缩略图地址：本地优先，回落到后端给的 CDN URL */
  const previewSrc = localPreview ?? value?.url ?? null;
  const isImage = !!value && (localPreview !== null || isImageUrl(value.url));
  const canPreview = previewable && !!value && !uploading;

  function forgetPreview() {
    setLocalPreview(null);
    setPreviewOpen(false);
  }

  async function startUpload(file: File | undefined) {
    if (!file || disabled || uploading) return;

    // 选同一个文件两次也要能重新触发 change，所以每次选完都清空 input 的值
    if (inputRef.current) inputRef.current.value = "";

    setLocalError(null);
    setPendingName(file.name);
    setUploading(true);
    onUploadingChange?.(true);

    try {
      const uploaded = await upload(file);
      // 图片才做本地预览；PDF 之类的缩略图没意义，给 value.url 走新窗口
      setLocalPreview(isImageFile(file) ? URL.createObjectURL(file) : null);
      onChange(uploaded);
    } catch (err) {
      setLocalError(
        err instanceof Error && err.message.trim() ? err.message : failedText,
      );
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  function openPreview() {
    if (!value) return;
    // 非图片（PDF）：交给浏览器新窗口打开，别塞进 <img>
    if (!isImage) {
      window.open(value.url, "_blank", "noopener,noreferrer");
      return;
    }
    setPreviewOpen(true);
  }

  const state: UploaderState = uploading ? "uploading" : dragging ? "dragging" : value ? "done" : "idle";

  const liveText = uploading
    ? `${uploadingText}${pendingName ? `（${pendingName}）` : ""}`
    : shownError
      ? shownError
      : value
        ? `${value.originalName}，${doneText}`
        : "";

  return (
    <>
      <FieldShell
        id={zoneId}
        label={label}
        hint={hint}
        error={shownError}
        required={required}
        className={className}
        style={style}
      >
        <UploaderZone
          id={zoneId}
          inputRef={inputRef}
          state={state}
          value={value}
          uploading={uploading}
          disabled={disabled}
          removable={removable}
          canPreview={canPreview}
          showThumb={isImage}
          previewSrc={previewSrc}
          accept={accept}
          actionText={actionText}
          constraintText={constraintText}
          uploadingText={uploadingText}
          doneText={doneText}
          removeText={removeText}
          previewText={previewText}
          pendingName={pendingName}
          liveText={liveText}
          onPick={() => inputRef.current?.click()}
          onPreview={openPreview}
          onRemove={() => {
            setLocalError(null);
            forgetPreview();
            onChange(null);
          }}
          onDragStateChange={setDragging}
          onFile={startUpload}
        />
      </FieldShell>

      {/*
        预览弹窗：点遮罩 / ESC 可关（`dismissOnVeil`）—— 它只是「看一眼」，
        不是隐私授权那类必须二选一的浮层。关闭按钮沿用弹窗底部等权样式。
      */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={previewTitle}
        width={420}
        dismissOnVeil
        footer={
          <div className="shhy-modal-actions">
            <Button
              variant="ghost"
              className="shhy-modal-action shhy-modal-action--cancel"
              onClick={() => setPreviewOpen(false)}
            >
              {closeText}
            </Button>
          </div>
        }
      >
        <div className="pt-1">
          {/* 任意宽高比都不撑破弹窗：限高 + object-contain */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc ?? ""}
            alt={value?.originalName ?? ""}
            className="mx-auto block max-h-[52vh] w-full rounded-[var(--r-sm)] border border-ink-100 bg-surface object-contain"
          />
          <p className="mt-2 truncate text-center text-sub text-ink-500">
            {value?.originalName}
          </p>
        </div>
      </Modal>
    </>
  );
}

interface UploaderZoneProps {
  id: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  state: UploaderState;
  value: UploadedFile | null;
  uploading: boolean;
  disabled: boolean;
  removable: boolean;
  canPreview: boolean;
  /** 已上传的是图片 → 图标位换成缩略图 */
  showThumb: boolean;
  previewSrc: string | null;
  accept: string;
  actionText: string;
  constraintText: string;
  uploadingText: string;
  doneText: string;
  removeText: string;
  previewText: string;
  pendingName: string;
  liveText: string;
  onPick: () => void;
  onPreview: () => void;
  onRemove: () => void;
  onDragStateChange: (dragging: boolean) => void;
  onFile: (file: File | undefined) => void;
}

/**
 * 上传区本体。单独抽出来是为了能在 `<FieldShell>` 内部调用 `useFieldA11y()`，
 * 拿到 hint / error 的 `aria-describedby` 关联（外壳与控件不互相等待）。
 */
function UploaderZone({
  id,
  inputRef,
  state,
  value,
  uploading,
  disabled,
  removable,
  canPreview,
  showThumb,
  previewSrc,
  accept,
  actionText,
  constraintText,
  uploadingText,
  doneText,
  removeText,
  previewText,
  pendingName,
  liveText,
  onPick,
  onPreview,
  onRemove,
  onDragStateChange,
  onFile,
}: UploaderZoneProps) {
  const a11y = useFieldA11y();

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    if (disabled || uploading) return;
    // 不 preventDefault 的话浏览器会当作「打开文件」，拖拽整个失效
    event.preventDefault();
    onDragStateChange(true);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    onDragStateChange(false);
    if (disabled || uploading) return;
    onFile(event.dataTransfer?.files?.[0]);
  }

  const primary =
    state === "uploading"
      ? uploadingText
      : value
        ? value.originalName
        : actionText;

  const secondary =
    state === "uploading"
      ? pendingName
      : value
        ? `${formatFileSize(value.size)} · ${doneText}`
        : constraintText;

  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        id={id}
        data-state={state}
        className={cx(
          "shhy-uploader",
          "flex min-h-[118px] flex-1 basis-0 cursor-pointer flex-col items-center justify-center gap-0 px-4 py-5",
          "rounded-[var(--r-md)] border border-dashed border-jade-300 bg-jade-50",
          "text-center transition-colors duration-[var(--t-fast)]",
          "hover:border-jade-400 hover:bg-jade-100",
          state === "dragging" && "border-jade-500 bg-jade-100",
          a11y.invalid && "border-error bg-error-bg",
          (disabled || uploading) && "cursor-default",
          disabled && "opacity-45",
        )}
        disabled={disabled || uploading}
        onClick={onPick}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={() => onDragStateChange(false)}
        onDrop={handleDrop}
        aria-describedby={a11y.describedBy}
        // 不带 aria-invalid / aria-required：`role=button` 不支持这两个属性
        // （jsx-a11y 会报），错误与必填一类的信息由 aria-describedby 关联的提示文本传达
        aria-busy={uploading || undefined}
      >
        {!uploading && showThumb && previewSrc ? (
          <Thumbnail src={previewSrc} />
        ) : (
          <span
            className={cx(
              "shhy-uploader__icon text-jade-700",
              uploading && "text-jade-600",
            )}
          >
            {uploading ? <Spinner /> : value ? <DoneIcon /> : <UploadIcon />}
          </span>
        )}

        <span className="mt-2 block w-full truncate text-body font-semibold text-ink-800">
          {primary}
        </span>
        <span className="mt-0.5 block w-full truncate text-sub text-ink-500">
          {secondary}
        </span>
      </button>

      {(canPreview || (removable && !!value && !uploading)) && (
        <div className="flex shrink-0 flex-col items-stretch gap-2">
          {canPreview && (
            <Button variant="ghost" size="md" disabled={disabled} onClick={onPreview}>
              {previewText}
            </Button>
          )}

          {removable && value && !uploading && (
            <Button variant="ghost" size="md" disabled={disabled} onClick={onRemove}>
              {removeText}
            </Button>
          )}
        </div>
      )}

      {/*
        原生 file input 只作机械通道：被 button 的 click 触发，
        因此不进 tab 序列、也不暴露给读屏（可发现性由上面的 button 承担）。
      */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => onFile(event.target.files?.[0])}
      />

      {/* 上传中 / 成功 / 失败都经由 live region 播报，读屏用户不会「点了没反应」 */}
      <span role="status" aria-live="polite" className="sr-only">
        {liveText}
      </span>
    </div>
  );
}
