"use client";

import { Card as SemiCard } from "@douyinfe/semi-ui-19";
import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "@/src/components/Avatar";
import { Button } from "@/src/components/Button";
import { CreditBar, type CreditBarProps } from "@/src/components/CreditBar";
import { cx } from "@/src/lib/cx";

export interface EnterpriseCardProps {
  /** 企业名称（工商全称或简称）。给字符串时才会自动推导 Logo 取字 */
  name: ReactNode;
  /** 完全接管 Logo 区（传了就忽略 `logoText` / `logoSrc`） */
  logo?: ReactNode;
  /** Logo 取字。不传且 `name` 是字符串时按规范 §05 规则推导 */
  logoText?: string;
  /** Logo 图片地址 */
  logoSrc?: string;
  /** 是否已工商实名认证 */
  verified?: boolean;
  /** 认证徽标文案，默认「实名」 */
  verifiedLabel?: ReactNode;
  /** 名称右侧任意徽标（传了就替代默认的实名徽标） */
  badge?: ReactNode;
  /** 名称下方一行，如「杭州 · 制造业 · 500 人」 */
  subtitle?: ReactNode;
  /** 元信息，默认最多展示 `metaLimit` 项 */
  meta?: ReactNode[];
  /** 元信息上限，默认 3；传 `Infinity` 不截断 */
  metaLimit?: number;
  /** 标签区，配合 `<Label>` 使用 */
  tags?: ReactNode;
  /** 信用评分，满分由 `creditProps.max` 决定 */
  score?: number | null;
  /** 透传给 `<CreditBar>`（`max` / `segments` / `labels` / `emptyText` …），`score` 除外 */
  creditProps?: Omit<CreditBarProps, "score">;
  /** 完全接管底部行动区 */
  actions?: ReactNode;
  /** 行动区下方的附加内容 */
  footer?: ReactNode;
  /** 整卡点击进入企业详情 */
  onEnter?: () => void;
  /** 电话按钮独立响应，不冒泡 */
  onPhone?: () => void;
  phoneLabel?: ReactNode;
  /** 默认行动按钮的文案 */
  enterLabel?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 卡片底部追加内容（自定义区块） */
  children?: ReactNode;
}

/**
 * 规范 §05 取字规则：取企业简称首字，宋体 700；无简称时取工商全称第 3–4 字。
 * `name` 非字符串（如组织好的 JSX）时无法推导，返回空串，由调用方用 `logoText` 指定。
 */
function pickLogoText(name: ReactNode): string {
  if (typeof name !== "string") return "";
  const cleaned = name.replace(/[（(].*?[)）]/g, "").trim();
  return cleaned.length > 4 ? cleaned.slice(2, 4) : cleaned.slice(0, 1);
}

/**
 * 企业卡片 Enterprise Card · 规范 §07 组件库 —— 基于 Semi `Card` 封装
 *
 * 默认结构：Logo 46–50px → 名称 → 元信息 → 标签 → 信用条 → 行动。
 *
 * - **信息封顶**：名称单行省略，元信息默认三项封顶，绝不铺陈经营范围。
 * - **触达**：整卡可点击进入详情（鼠标便利）；电话按钮独立响应、不冒泡。
 *   键盘与读屏走的是卡内的行动按钮，因此不再给整卡加 `role="button"`，
 *   避免出现「按钮里套按钮」的非法嵌套。
 * - **信用条**：四段表示四维可信度，分数右对齐。
 * - **v2 变更**：Logo 方块由深色渐变（jade-600 → ink-800）改为浅玉青渐变
 *   （jade-100 → jade-200）+ 深玉青字 jade-900。这是「视觉减重」最关键的一处 ——
 *   一个列表里 10 个深色方块，累积起来就是「重」的主要来源。
 *
 * 灵活位（每个区块都可以单独替换或整块去掉）：
 * - `logo` / `logoSrc` / `logoText` —— Logo 区三种给法；
 * - `badge` 替代默认的实名徽标，`subtitle` 加一行副标题；
 * - `meta` / `metaLimit` —— 元信息条数与上限；
 * - `actions` 完全接管底部行动区（默认按 `onEnter` / `onPhone` 生成）；
 * - `footer` / `children` 追加自定义区块；
 * - `creditProps` 换评分模型（`max` / `segments` / `labels`）。
 *
 * 层级选择说明：默认行动按钮用 `secondary`（玉青 50 底）+ `outline`，
 * 不用 `primary` 实底 —— 一屏会渲染多张卡片，多个实底主按钮会突破
 * §02「深色面积占比 < 8%」红线，也会破坏「每屏只允许一个主按钮」的收敛原则。
 * 传 `actions` 自建按钮时请沿用这条。
 */
export function EnterpriseCard({
  name,
  logo,
  logoText,
  logoSrc,
  verified = false,
  verifiedLabel = "实名",
  badge,
  subtitle,
  meta = [],
  metaLimit = 3,
  tags,
  score,
  creditProps,
  actions,
  footer,
  onEnter,
  onPhone,
  phoneLabel = "电话联系",
  enterLabel = "查看详情",
  className,
  style,
  children,
}: EnterpriseCardProps) {
  const visibleMeta = meta.slice(0, metaLimit);
  const hasBadge = badge !== undefined || verified;

  const defaultActions =
    onPhone || onEnter ? (
      <div className="flex gap-2">
        {onPhone && (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onPhone();
            }}
          >
            {phoneLabel}
          </Button>
        )}
        {onEnter && (
          <Button
            size="sm"
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation();
              onEnter();
            }}
          >
            {enterLabel}
          </Button>
        )}
      </div>
    ) : null;

  return (
    <article
      onClick={onEnter}
      className={cx("shhy-ecard", onEnter && "shhy-ecard--clickable", className)}
      style={style}
    >
      <SemiCard bordered bodyStyle={{ padding: 16 }}>
        <div className="flex gap-[13px]">
          {logo ?? (
            <Avatar
              text={logoText || pickLogoText(name)}
              src={logoSrc}
              size={50}
              rounded="md"
            />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-body font-semibold leading-snug text-ink-900">
                {name}
              </h3>
              {hasBadge && (
                <span className="shrink-0">
                  {badge ?? (
                    <span
                      className="text-cap font-semibold text-jade-600"
                      title="工商实名认证"
                    >
                      <span aria-hidden="true">✓ </span>
                      {verifiedLabel}
                    </span>
                  )}
                </span>
              )}
            </div>

            {subtitle && (
              <p className="mt-[5px] text-[11.5px] text-ink-600">{subtitle}</p>
            )}

            {visibleMeta.length > 0 && (
              <p className="my-[5px] flex flex-wrap gap-1.5 text-[11.5px] text-ink-500">
                {visibleMeta.map((item, index) => (
                  <span key={index} className="flex items-center gap-1.5">
                    {index > 0 && <em className="not-italic text-ink-300">·</em>}
                    {item}
                  </span>
                ))}
              </p>
            )}

            {tags && (
              <div className="flex flex-wrap items-center gap-1.5 pb-1">{tags}</div>
            )}

            <CreditBar score={score} className="my-2" {...creditProps} />

            {actions ?? defaultActions}

            {footer}
          </div>
        </div>

        {children}
      </SemiCard>
    </article>
  );
}
