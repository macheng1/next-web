"use client";

import { Progress as SemiProgress } from "@douyinfe/semi-ui-19";
import type { CSSProperties } from "react";
import { cx } from "@/src/lib/cx";

export interface CreditBarProps {
  /** 总分，满分由 `max` 决定；传 null / 0 视为暂无评分 */
  score?: number | null;
  /** 满分，默认 5 */
  max?: number;
  /** 段数，默认 4 */
  segments?: number;
  /** 每段的维度名，用于悬浮提示与读屏；长度不足时忽略多余的 */
  labels?: string[];
  /** 无评分时的文案，默认「暂无评分」 */
  emptyText?: string;
  /** 是否在条尾显示分数，默认 `true` */
  showValue?: boolean;
  /** 条高 px，默认 4 */
  height?: number;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_MAX = 5;
const DEFAULT_SEGMENTS = 4;

/**
 * 签名组件 · 信用条 · 规范 §08 —— 基于 Semi `Progress` 封装
 *
 * 默认四段分别对应工商认证、资质证书、合作评价、响应速度，每段满值 1.25，总分 5.0。
 * 把抽象的信任度压缩成可一眼扫描的视觉刻度 —— 这是全产品最需要被记住的元素。
 *
 * 设计约束：
 * - 高度 4px，圆角 2px，段间距 5px。
 * - 填充色「玉青 500 → 300」线性渐变，空段为墨青 200（轨道底色）。
 * - 数字等宽字体 11px、玉青 700，紧贴条尾。
 * - **无障碍**：必须带 `aria-label="信用评分 4.8 分（满分 5 分）"`，不能只靠颜色传达。
 *   四段 Progress 各自带 `progressbar` 语义，会与汇总标签互相干扰，
 *   因此统一套一层 `aria-hidden`，只让汇总标签被读屏播报。
 * - **禁用场景**：新入驻未认证企业显示「暂无评分」，不显示零段空条。
 * - 企业端可反转为「待完善项」清单，指导企业补全资质（工作台功能，本组件未实现）。
 *
 * 灵活位：`max` / `segments` / `labels` 可换成任意维度的评分模型，
 * `emptyText` 换空态文案，`height` 调条高（圆角按高度自动取一半）。
 */
export function CreditBar({
  score,
  max = DEFAULT_MAX,
  segments = DEFAULT_SEGMENTS,
  labels,
  emptyText = "暂无评分",
  showValue = true,
  height = 4,
  className,
  style,
}: CreditBarProps) {
  const hasScore = typeof score === "number" && score > 0;

  if (!hasScore) {
    return (
      <span
        className={cx("font-mono text-cap text-ink-400", className)}
        style={style}
        aria-label={emptyText}
      >
        {emptyText}
      </span>
    );
  }

  const safeScore = Math.min(score as number, max);
  const segmentValue = max / segments;
  const decimals = Number.isInteger(max) ? 1 : 2;

  return (
    <div
      className={cx("shhy-credit flex items-center gap-[5px]", className)}
      style={{ ...style, "--shhy-credit-h": `${height}px` } as CSSProperties}
    >
      <div
        role="img"
        aria-label={`信用评分 ${safeScore.toFixed(decimals)} 分（满分 ${max} 分）`}
        className="flex flex-1 items-center gap-[5px]"
      >
        {Array.from({ length: segments }, (_, index) => {
          const filled = Math.min(
            Math.max(safeScore - index * segmentValue, 0) / segmentValue,
            1,
          );
          const label = labels?.[index];

          return (
            <span
              key={index}
              aria-hidden="true"
              title={label}
              className="shhy-credit-seg"
            >
              <SemiProgress
                percent={filled * 100}
                showInfo={false}
                strokeWidth={height}
                size="small"
              />
            </span>
          );
        })}
      </div>
      {showValue && (
        <b className="ml-1 shrink-0 font-mono text-cap font-semibold text-jade-700">
          {safeScore.toFixed(decimals)}
        </b>
      )}
    </div>
  );
}
