/**
 * 轻量 className 合并工具。
 * 本轮不引入 clsx / tailwind-merge 依赖，保持组件库零新增依赖。
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
