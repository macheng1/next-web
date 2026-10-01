// src/dictionaries.ts
import "server-only"; // 确保这些字典只在服务端加载，不占用客户端体积

// 1. 定义支持的语言类型
import type { Locale } from "../lib/i18n/locale";
export type { Locale } from "../lib/i18n/locale";

// 2. 定义字典对象的结构（保持动态导入以实现懒加载）
const dictionaries = {
  zh: () => import("./zh.json").then((module) => module.default),
  en: () => import("./en.json").then((module) => module.default),
};

/**
 * 获取指定语言的字典数据
 * @param lang 语言代码 ('zh' | 'en')
 * @returns 对应语言的 JSON 对象
 */
export const getDictionary = async (lang: Locale) => {
  // 稳健性处理：如果传入了不支持的语言，默认返回中文
  const loader = dictionaries[lang] || dictionaries.zh;
  return loader();
};

// 3. 核心技巧：导出字典类型，用于组件 Props 的类型声明
// 这样你在写组件时，输入 dict. 就会自动弹出字段建议
export type Dictionary = Awaited<ReturnType<typeof dictionaries.zh>>;
