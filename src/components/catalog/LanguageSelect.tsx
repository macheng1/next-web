"use client";
import { Dropdown } from "@douyinfe/semi-ui-19";
import { IconGlobe, IconChevronDown, IconTick } from "@douyinfe/semi-icons";
import { setPreferredLocale } from "@/src/lib/i18n/set-locale";
import { useRouter } from "next/navigation";
import { Button } from "../Button";
import { useFoundation } from "../Providers";
import { catalogCopy } from "@/src/lib/catalog/copy";
export function LanguageSelect() {
  const { locale } = useFoundation();
  const router = useRouter();
  function change(value: "zh" | "en") {
    setPreferredLocale(value);
    router.refresh();
  }
  return (
    <Dropdown
      trigger="click"
      position="bottomRight"
      render={
        <Dropdown.Menu>
          {(["en", "zh"] as const).map((value) => (
            <Dropdown.Item
              key={value}
              onClick={() => change(value)}
              icon={locale === value ? <IconTick /> : undefined}
            >
              {value === "en" ? "English" : "简体中文"}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      }
    >
      <span className="inline-flex">
        <Button
          radius={6}
          variant="ghost"
          icon={<IconGlobe />}
          aria-label={catalogCopy(locale).language}
        >
          {locale === "en" ? "English" : "简体中文"} <IconChevronDown />
        </Button>
      </span>
    </Dropdown>
  );
}
