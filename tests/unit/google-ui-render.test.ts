import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { GoogleButton } from "../../src/components/auth/GoogleButton";
import { LoginForm } from "../../src/components/auth/LoginForm";
import { RegisterForm } from "../../src/components/auth/RegisterForm";
import { GoogleCompletionForm } from "../../src/components/auth/GoogleCompletionForm";
import { GoogleSecurityMethods } from "../../src/components/auth/GoogleSecurityMethods";
// UI kit adapters preserve native control semantics for offline server rendering.
vi.mock("@douyinfe/semi-icons", () => ({
  IconEyeOpened: () => null,
  IconEyeClosed: () => null,
  IconGlobe: () => null,
  IconChevronDown: () => null,
  IconTick: () => null,
}));
vi.mock("@douyinfe/semi-ui-19", () => ({
  Button: ({
    children,
    htmlType,
    disabled,
    icon,
  }: {
    children?: React.ReactNode;
    htmlType?: "button" | "submit";
    disabled?: boolean;
    icon?: React.ReactNode;
  }) => createElement("button", { type: htmlType, disabled }, icon, children),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    createElement("input", props),
  Checkbox: ({
    children,
    checked,
  }: {
    children?: React.ReactNode;
    checked?: boolean;
  }) =>
    createElement(
      "label",
      {},
      createElement("input", { type: "checkbox", checked, readOnly: true }),
      children,
    ),
  Modal: () => null,
  Dropdown: () => null,
}));
const state = vi.hoisted(() => ({ locale: "en" as "en" | "zh" }));
vi.mock("../../src/components/Providers", () => ({
  useFoundation: () => ({ locale: state.locale }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../../src/lib/catalog/use-catalog", () => ({
  useCatalog: () => ({
    data: {
      version: "current",
      terms: { title: "Terms", body: "Terms" },
      privacy: { title: "Privacy", body: "Privacy" },
    },
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}));
it.each(["en", "zh"] as const)(
  "renders shared Google entry and preserved email forms offline in %s",
  (locale) => {
    state.locale = locale;
    const button = renderToStaticMarkup(createElement(GoogleButton));
    expect(button).toContain(
      locale === "en" ? "Continue with Google" : "使用 Google 继续",
    );
    expect(button).toContain('type="button"');
    const login = renderToStaticMarkup(
      createElement(LoginForm, { googleAvailable: true }),
    );
    const register = renderToStaticMarkup(
      createElement(RegisterForm, { googleAvailable: true }),
    );
    expect(login).toContain('type="password"');
    expect(login).toContain('type="email"');
    expect(register).toContain('type="email"');
    expect(register).toContain("google-g.png");
    expect(login + register).not.toContain("not yet available");
    expect(login + register).not.toContain("尚未开放");
    expect(renderToStaticMarkup(createElement(GoogleCompletionForm))).toContain(
      'role="status"',
    );
    const security = renderToStaticMarkup(
      createElement(GoogleSecurityMethods, {
        member: {
          id: "buyer",
          email: "buyer@test.com",
          memberType: "personal",
          nickname: null,
          avatarUrl: null,
          emailVerified: true,
          hasPassword: false,
          mustChangePassword: false,
        },
        googleAvailable: true,
      }),
    );
    expect(security).toContain(
      locale === "en" ? "Sign-in methods" : "登录方式",
    );
  },
);
