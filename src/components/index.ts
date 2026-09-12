/**
 * 商汇设计系统 · Web 端组件库
 * 规范来源：《商汇黄页-01-设计规范》v2.0 第 07 章「组件库」+ 第 08 章「签名组件 · 信用条」
 *
 * 实现方式：全部基于项目既有的 **Semi UI（`@douyinfe/semi-ui-19`）** 组件封装，
 * 不手写按钮 / 输入框 / 开关 / 浮层等基础交互件。
 *
 * 分工：
 * - 令牌与配色 → `src/styles/tokens.css` + `src/styles/semi-theme.css`
 *   （后者把 Semi 的 `--semi-color-*` 语义变量桥接到玉青·墨青，并改写组件几何）
 * - className 合并 → `src/lib/cx.ts`
 * - 语义与约束 → 本目录各组件，只做「传参映射 + 规范红线兜底」
 *
 * 目录约定：一个组件一个同名目录，入口恒为 `index.tsx`
 * （如 `src/components/Avatar/index.tsx`），与本仓库 navbar / footer / AboutUsContent 一致。
 * 既可直接裸导入 `@/src/components/Avatar`，也可从本文件统一导入。
 *
 * ── 灵活度约定（所有组件一致，不传参数时就是规范默认值）────────────────
 * 1. **尺寸**：接受档位字符串，也接受数字做精细控制
 *    （`<Button size={52} />`、`<Chip size={40} />`、`<Switch size={56} />`）。
 * 2. **配色**：`tone={{ bg, fg, border }}` 换色，三个维度可只传其一，
 *    未传的沿用该组件默认值；需要交互态颜色的组件，hover / active 由底色自动变暗。
 *    另有一档 `radius` 单独控制圆角。
 * 3. **结构**：内部区块一律「有 props 用 props，没有才渲染默认」，
 *    常用槽位如 `icon` / `badge` / `subtitle` / `actions` / `footer` / `children`。
 *    需要「非文本框」的表单控件时用 `<FieldShell>`，外壳与无障碍关联与 `<Field>` 完全一致。
 * 4. **文案**：组件内不内嵌业务文案，全部由调用方传入并带中性默认值
 *    （`enterLabel`、`verifiedLabel`、`emptyText`、`phoneLabel`…）。
 * 5. **红线不开可配项**：标签不可点（`Label` 不提供任何点击回调）、
 *    弹窗无 × 按钮必须二选一（`closable` 恒为 false）、交互元素触碰下限 46px。
 *    这些是规范约束而非配置项，需要变更请先改规范。
 *
 * 已实现（Semi 基座 → 商汇组件）：
 *   Button → Button ｜ Input/TextArea → Field(+FieldShell) ｜ Switch → Switch
 *   Tag → Chip / Label ｜ Avatar → Avatar ｜ Progress → CreditBar
 *   Card → EnterpriseCard ｜ Modal → Modal ｜ SideSheet → Sheet
 * 规范第 06 章「企业端专属组件」只有文字描述、没有配套 CSS，按描述实现：
 *   上传区 Uploader（虚线玉青边 + 浅玉青底 + 图标 + 双行文案）→ Uploader
 *
 * 未实现（同样只有文字描述，且缺乏本项目的落地场景）：
 *   经营工具卡 Tool（38px 图标块 + 标题 + 说明 + 状态角标，2 列网格）、
 *   模块开关行 Module Row（拖拽手柄 + 名称/说明 + 46px 开关）—— 都属企业工作台/主页装修，等对应页面开工。
 */
export { Avatar, type AvatarProps, type AvatarRounded } from "./Avatar";
export {
  Button,
  type ButtonProps,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
} from "./Button";
export { Chip, type ChipProps, type ChipSize, type ChipTone } from "./Chip";
export { CreditBar, type CreditBarProps } from "./CreditBar";
export {
  EnterpriseCard,
  type EnterpriseCardProps,
} from "./EnterpriseCard";
export {
  Field,
  FieldShell,
  useFieldA11y,
  type FieldA11y,
  type FieldProps,
  type FieldShellProps,
} from "./Field";
export {
  Label,
  type LabelCustomTone,
  type LabelProps,
  type LabelSize,
  type LabelTone,
} from "./Label";
export {
  Modal,
  ModalActions,
  ModalList,
  type ModalListItem,
  type ModalActionsProps,
  type ModalProps,
} from "./Modal";
export {
  Sheet,
  SheetActions,
  type SheetActionsProps,
  type SheetProps,
} from "./Sheet";
export { Switch, type SwitchProps, type SwitchSize } from "./Switch";
export {
  Uploader,
  type UploaderProps,
  type UploaderState,
} from "./Uploader";
