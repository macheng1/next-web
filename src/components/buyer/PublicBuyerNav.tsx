"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Dropdown } from "@douyinfe/semi-ui-19";
import { Button } from "../Button";
import { useFoundation } from "../Providers";
import { buyerCopy } from "@/src/lib/buyer/copy";
import { useBuyer } from "@/src/lib/buyer/use-buyer";
import { checkSession } from "@/src/lib/auth-api";
import { listGroups, subscribeBuyer } from "@/src/lib/buyer/draft-storage";
import type { Summary } from "@/src/lib/buyer/types";
export function PublicBuyerNav() {
  const { locale } = useFoundation(),
    t = buyerCopy(locale),
    router = useRouter();
  const summary = useBuyer<Summary>("summary");
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const update = () => {
      void checkSession().then((session) => {
        if (active && session.status === "authenticated")
          setCount(
            Object.values(listGroups(session.member.id)).reduce(
              (n, rows) => n + rows.length,
              0,
            ),
          );
      });
    };
    update();
    const stop = subscribeBuyer(update);
    return () => {
      active = false;
      stop();
    };
  }, []);
  const menu = [
    ["/buyer", t.overview],
    ["/buyer/inquiries", t.inquiries],
    ["/buyer/list", t.list],
    ["/buyer/saved", t.saved],
    ["/buyer/messages", t.messages],
    ["/buyer/settings", t.security],
  ];
  const unread =
    (summary.data?.unreadMessages || 0) +
    (summary.data?.unreadNotifications || 0);
  return (
    <div className="flex items-center gap-3">
      <Link href="/buyer/list" className="text-sm text-jade-700">
        {t.list}
        {count > 0 ? ` (${count})` : ""}
      </Link>
      <Link
        href="/buyer/messages"
        className="text-sm text-jade-700"
        aria-label={t.messages}
      >
        <svg
          className="inline-block h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3zM10 21h4" />
        </svg>
        {unread > 0 ? ` ${unread}` : ""}
      </Link>
      <Dropdown
        trigger="click"
        render={
          <Dropdown.Menu>
            {menu.map(([href, label]) => (
              <Dropdown.Item key={href} onClick={() => router.push(href)}>
                {label}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        }
      >
        <span>
          <Button variant="ghost" size="sm">
            {t.workspaceTitle} ⌄
          </Button>
        </span>
      </Dropdown>
    </div>
  );
}
