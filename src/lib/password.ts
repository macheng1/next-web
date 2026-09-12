/**
 * 登录密码强度（前端侧）。
 *
 * 后端只要求「至少 8 位」（§7.4 / §7.10），这里按项目约定收紧到
 * 「8-20 位且同时含字母与数字」—— 目的是在提交前就给出可执行的修改建议，
 * 真实强度规则仍以后端为准。重置密码与强制改密两处都要用，抽出来防两处漂移。
 */
export function isStrongPassword(value: string): boolean {
  return (
    value.length >= 8 &&
    value.length <= 20 &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value)
  );
}
