"use client";
import { Dropdown } from "@douyinfe/semi-ui-19";
import { IconGlobe, IconChevronDown, IconTick } from "@douyinfe/semi-icons";
import { setPreferredLocale } from "@/src/lib/i18n/set-locale";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../Button";
import { useFoundation } from "../Providers";
import { catalogCopy } from "@/src/lib/catalog/copy";
export function LanguageSelect({compact=false}:{compact?:boolean}) {
  const { locale } = useFoundation();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  function change(value: "zh" | "en") {
    setVisible(false);
    if (value === locale) return;
    setPreferredLocale(value);
    router.refresh();
  }
  return (
    <Dropdown
      trigger="click"
      visible={visible}
      onVisibleChange={setVisible}
      position="bottomRight"
      render={
        <Dropdown.Menu>
          {(["en", "zh"] as const).map((value) => (
            <Dropdown.Item
              key={value}
              onClick={() => change(value)}
              // Keep the icon slot mounted: browser translation may replace adjacent text nodes.
              icon={<IconTick style={{ visibility: locale === value ? "visible" : "hidden" }} />}
            >
              <span translate="no">{value === "en" ? "English" : "简体中文"}</span>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      }
    >
      <span className="inline-flex">
        <Button
          radius={6}
          variant="ghost"
          icon={compact ? undefined : <IconGlobe />}
          aria-label={catalogCopy(locale).language}
        >
          {locale === "en" ? "English" : "简体中文"} <IconChevronDown />
        </Button>
      </span>
    </Dropdown>
  );
}
