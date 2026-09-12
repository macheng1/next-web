"use client";
import { FC, useState, useEffect, useRef } from "react";
import { SideSheet } from "@douyinfe/semi-ui-19";
import { IconMenu, IconLanguage, IconChevronDown } from "@douyinfe/semi-icons";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Dictionary } from "@/src/dictionaries"; // 💡 导入类型定义
import { Button } from "@/src/components/Button";

export interface INavBarProps {
  /** 移动端抽屉菜单。不传或传空数组时，回落到与桌面端同一套菜单 */
  menuItems?: Array<{ label: string; href: string }>;
  logoHref?: string;
  /** 是否展示登录入口，默认展示 */
  showLogin?: boolean;
  /** 登录入口地址。平台账号统一走根级 `/login`，不在租户门户下 */
  loginHref?: string;
  title?: string;
  logo?: string;
  dict: Dictionary["nav"]; // 💡 传入完整的字典对象
}

/**
 * 租户门户导航条。
 *
 * 两处刻意的设计：
 * 1. **菜单只用一份**：桌面端由 `domain` / `lang` 拼出站内路径，移动端抽屉以前单独吃
 *    `menuItems`，后端不下发时会渲染出一个空抽屉；现在空数组即回落桌面菜单。
 * 2. **登录入口指向根级 `/login`**：登录态属于平台账号、不属于某个租户门户
 *    （见 `src/app/(auth)/layout.tsx` 的说明），所以不带 `domain` / `lang`。
 */
export const NavBar: FC<INavBarProps> = ({
  menuItems = [],
  logoHref = "/",
  showLogin = true,
  loginHref = "/login",
  title,
  logo,
  dict,
}) => {
  const [visible, setVisible] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const langRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const domain = (params.domain as string) || "wuxi-yuansi";
  const lang = (params.lang as string) || "zh";
  const isEn = lang === "en";
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (next: string) => {
    // 语言偏好除了改 URL，还要写进 Cookie —— 登录 / 注册这类不带语言段的路由
    // 靠 `NEXT_LOCALE` 决定用哪份字典（见 src/lib/locale.ts），不写就会出现
    // 「门户已切英文，点登录又变回中文」。
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`;

    const pathSegments = pathname.split("/");
    if (pathSegments.length >= 4) {
      pathSegments[3] = next;
      router.push(pathSegments.join("/"));
    }
    setIsLangOpen(false);
  };

  const goLogin = () => {
    setVisible(false);
    router.push(loginHref);
  };

  const desktopMenuItems = [
    {
      label: dict?.home,
      href: `/portal/${domain}/${lang}`,
    },
    {
      label: dict?.products,
      href: `/portal/${domain}/${lang}/products`,
    },
    {
      label: isEn ? "Jobs" : "招聘",
      href: `/portal/${domain}/${lang}/jobs`,
    },
    {
      label: dict?.contact,
      href: `/portal/${domain}/${lang}/contact`,
    },
  ];
  const mobileMenuItems =
    menuItems.length > 0 ? menuItems : desktopMenuItems;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-ink-200 bg-surface/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-[68px] flex items-center justify-between">
        {/* 1. Logo 区域 */}
        <Link
          href={logoHref}
          className="flex items-center no-underline shrink-0 group"
        >
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={title || "Logo"}
              className="h-8 w-auto max-w-[120px] object-contain"
            />
          )}
          <span className="ml-3 font-display text-h3 text-ink-900 truncate max-w-[150px]">
            {title}
          </span>
        </Link>

        {/* 2. 桌面端菜单 */}
        <div className="hidden md:flex flex-1 items-center ml-10 gap-x-1">
          {desktopMenuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="inline-flex h-[46px] items-center px-4 text-body font-semibold text-ink-700 no-underline transition-colors duration-[var(--t-fast)] hover:bg-jade-50 hover:text-jade-700"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* 3. 右侧操作区 */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* 💡 桌面端中英文切换 */}
          <div className="hidden md:block relative" ref={langRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex h-[46px] items-center gap-1 border border-ink-200 px-3 text-sub font-semibold text-ink-600 transition-colors duration-[var(--t-fast)] hover:bg-ink-50"
            >
              <IconLanguage size="large" className="text-ink-400" />
              <span>{isEn ? "EN" : "ZH"}</span>
              <IconChevronDown
                size="small"
                className={`transition-transform duration-200 ${
                  isLangOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* 下拉菜单浮层 */}
            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-surface border border-ink-200 shadow-3 z-50 py-1 overflow-hidden">
                <button
                  onClick={() => handleLanguageChange("zh")}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    !isEn
                      ? "text-jade-700 bg-jade-50 font-semibold"
                      : "text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  简体中文
                </button>
                <button
                  onClick={() => handleLanguageChange("en")}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    isEn
                      ? "text-jade-700 bg-jade-50 font-semibold"
                      : "text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  English
                </button>
              </div>
            )}
          </div>

          {/* 💡 登录入口：登录态属于平台账号，走根级 /login（不带 domain/lang） */}
          {showLogin && (
            <div className="hidden md:block">
              {/* 导航条属鼠标 / 密集场景，取 sm 档 34px（§10 的 46px 触达下限针对触屏）；
                  移动端抽屉里的登录按钮取 lg 48px。每屏只允许一个主按钮 —— 这里就是那一个。 */}
              <Button variant="primary" size="sm" onClick={goLogin}>
                {dict?.login}
              </Button>
            </div>
          )}

          {/* 移动端菜单按钮 */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="md"
              icon={<IconMenu size="large" />}
              aria-label={dict?.openMenu}
              onClick={() => setVisible(true)}
              style={{ width: 46, padding: 0 }}
            />
          </div>
        </div>

        {/* 移动端侧边抽屉适配 */}
        <SideSheet
          title={<span className="font-display text-h3 text-ink-900">{title}</span>}
          visible={visible}
          onCancel={() => setVisible(false)}
          width={280}
        >
          <div className="flex flex-col h-full">
            <div className="flex flex-col flex-1">
              {mobileMenuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setVisible(false)}
                  className="inline-flex min-h-[46px] items-center px-4 text-body font-semibold text-ink-700 no-underline transition-colors duration-[var(--t-fast)] hover:bg-jade-50 hover:text-jade-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-ink-100 pt-5">
              {/* 语言切换：原来整块被注释掉，移动端用户无法切换语言 */}
              <div
                role="group"
                aria-label={dict?.language}
                className="flex gap-1 rounded-md bg-ink-100 p-1"
              >
                {[
                  { value: "zh", label: "简体中文" },
                  { value: "en", label: "English" },
                ].map((item) => {
                  const active = (item.value === "en") === isEn;
                  return (
                    <button
                      key={item.value}
                      onClick={() => handleLanguageChange(item.value)}
                      className={`flex-1 rounded-[9px] py-2.5 text-sub transition-colors duration-[var(--t-fast)] ${
                        active
                          ? "bg-surface font-semibold text-jade-700 shadow-1"
                          : "text-ink-600"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {showLogin && (
                <Button variant="primary" size="lg" block onClick={goLogin}>
                  {dict?.login}
                </Button>
              )}
            </div>
          </div>
        </SideSheet>
      </div>
    </nav>
  );
};
