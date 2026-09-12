"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Toast } from "@douyinfe/semi-ui-19";
import type { Dictionary } from "@/src/dictionaries";
import { Button } from "@/src/components/Button";
import { Field } from "@/src/components/Field";
import { Switch } from "@/src/components/Switch";
import { Uploader } from "@/src/components/Uploader";
import { AuthHeading, AuthNotice } from "@/src/components/AuthShell/parts";
import { register, resolveAuthError } from "@/src/lib/auth-api";
import {
  PHONE_RE,
  SMS_CODE_RE,
  SMS_RESEND_SECONDS,
  SMS_SCENES,
  sendSmsCode,
} from "@/src/lib/sms-api";
import { uploadWebFile } from "@/src/lib/upload-api";
import type { UploadedFile } from "@/src/lib/upload-api";

type AuthDict = Dictionary["auth"];

interface FieldErrors {
  email?: string;
  phone?: string;
  smsCode?: string;
  companyName?: string;
  creditCode?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RegisterFormProps {
  dict: AuthDict;
  loginHref?: string;
  homeHref?: string;
}

/**
 * 企业账号注册 · wx-backend §7.5 `POST /web/members/register`
 *
 * 四件必须清楚的事：
 *
 * 1. **注册时不设密码。** 接口没有 `password` 字段 —— 初始密码由后台**审核通过**时
 *    随机生成并邮件下发，且 `mustChangePassword=true`（首次登录必须改密）。
 * 2. **注册 ≠ 已开通。** 此时 `memberType` 还是 `personal`，登录不了 web 端，
 *    所以提交成功**不跳首页、也不建立登录态**，而是切到「申请已提交」结果态。
 * 3. **手机号要真短信验证**：提交前必须先「获取验证码」——经 `/api/sms/send-code`
 *    让后端发一条短信（scene=register），再把 `phone` + `smsCode` 一起提交。
 *    后端**两次的 scene 必须一致**，且验证码校验成功即销毁（一次性）。
 *    ⚠️ 开发环境后端未配短信 Key 时**不发短信**，验证码只打在后端日志里。
 * 4. **字段**：必填是 `email` / `phone` / `smsCode` / `companyName`，
 *    多传一个就 400（后端 `forbidNonWhitelisted`，§1.5）。
 *
 * ⚠️ 营业执照走 `businessLicenseUrl`：**先传文件拿 URL，再随注册一起提交**。
 * 上传口是后端为注册场景单开的**公开**接口 `POST /web/files/upload`
 * （注册时还没有 token，通用 `/files/upload` 挂了守卫会匿名 401），
 * 前端经 BFF `/api/upload/web-file` 转发，见该路由顶部注释。
 *
 * 错误提示是**双通道**：字段下方红字（`Field.error`，带 aria-describedby，读屏可达）
 * + `Toast.error` 轻提示（解决「字段在视口外时用户看不到为什么提交没反应」）。
 * toast 是补充，不是替代 —— 去掉红字会丢掉「哪个字段错了」的空间关联。
 */
export function RegisterForm({
  dict,
  loginHref = "/login",
  homeHref = "/",
}: RegisterFormProps) {
  const router = useRouter();
  const copy = dict.register;
  const field = dict.fields;
  const msg = dict.errors;

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [creditCode, setCreditCode] = useState("");
  const [legalPerson, setLegalPerson] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  /** 已上传的营业执照（`null` = 还没传；选填，不传就不提交该字段） */
  const [license, setLicense] = useState<UploadedFile | null>(null);
  /** 上传进行中：此时不允许提交，否则会漏掉 `businessLicenseUrl` */
  const [licenseUploading, setLicenseUploading] = useState(false);
  /** 验证码发送中（按钮 loading / 防重复点击） */
  const [sendingCode, setSendingCode] = useState(false);
  /** 重发倒计时剩余秒数，>0 时「获取验证码」不可点 */
  const [countdown, setCountdown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** 提交成功后的回执邮箱，用于结果态文案 */
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  // 重发倒计时：每秒减一，归零后按钮恢复可点。
  // 用 setTimeout 逐次续而不是 setInterval：组件卸载时清理更干净，也不会在
  // 后台标签页被浏览器节流后一次性补跳好几秒。
  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  function clearError(key: keyof FieldErrors) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  /** 字段校验失败统一走 toast（同时保留字段下方红字，两者互补不互斥） */
  function toastErrors(next: FieldErrors) {
    for (const message of Object.values(next)) {
      if (message) Toast.error(message);
    }
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedCompany = companyName.trim();
    const trimmedCreditCode = creditCode.trim();

    if (!trimmedEmail) next.email = msg.emailRequired;
    else if (!EMAIL_RE.test(trimmedEmail)) next.email = msg.emailInvalid;

    if (!trimmedPhone) next.phone = msg.phoneRequired;
    else if (!PHONE_RE.test(trimmedPhone)) next.phone = msg.phoneInvalid;

    const trimmedCode = smsCode.trim();
    if (!trimmedCode) next.smsCode = msg.smsCodeRequired;
    else if (!SMS_CODE_RE.test(trimmedCode)) next.smsCode = msg.smsCodeInvalid;

    if (!trimmedCompany) next.companyName = msg.companyRequired;
    else if (trimmedCompany.length > 256) next.companyName = msg.companyTooLong;

    if (trimmedCreditCode && trimmedCreditCode.length > 32) {
      next.creditCode = msg.creditCodeTooLong;
    }

    setErrors(next);
    toastErrors(next);

    // 协议未勾选不给 Switch 挂错误态（开关没有「错误样式」这一档），
    // 统一走表单级提示条：同样是「颜色 + 图标 + 文案」三重提示，且带 role="alert"。
    if (!agreed) {
      setFormError(msg.agreeRequired);
      Toast.error(msg.agreeRequired);
    }

    return Object.keys(next).length === 0 && agreed;
  }

  /** 获取短信验证码（scene 固定 register，与提交注册时后端校验用的 scene 一致） */
  async function handleSendCode() {
    if (sendingCode || countdown > 0 || submitting) return;

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setErrors((prev) => ({ ...prev, phone: msg.phoneRequired }));
      Toast.error(msg.phoneRequired);
      return;
    }
    if (!PHONE_RE.test(trimmedPhone)) {
      setErrors((prev) => ({ ...prev, phone: msg.phoneInvalid }));
      Toast.error(msg.phoneInvalid);
      return;
    }

    setSendingCode(true);
    try {
      await sendSmsCode(
        { phone: trimmedPhone, scene: SMS_SCENES.REGISTER },
        msg.smsCodeSendFailed,
      );
      // 验证码一次性：重发后旧的作废，清空输入框免得用户拿旧码去提交
      setSmsCode("");
      clearError("smsCode");
      setCountdown(SMS_RESEND_SECONDS);
      Toast.success(copy.sendCodeSent);
    } catch (error) {
      // 频控（「发送过于频繁，请稍后再试」）等后端原因原样展示，并进表单级提示条 ——
      // 这条错误既不属于手机号格式、也不属于验证码内容，挂在任一字段下都会误导
      const text = resolveAuthError(error, msg.smsCodeSendFailed, msg.network);
      setFormError(text);
      Toast.error(text);
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (licenseUploading) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register(
        {
          email: email.trim(),
          phone: phone.trim(),
          smsCode: smsCode.trim(),
          companyName: companyName.trim(),
          // 选填字段：留空就不传，别给后端送空串
          ...(creditCode.trim() ? { creditCode: creditCode.trim() } : {}),
          ...(legalPerson.trim() ? { legalPerson: legalPerson.trim() } : {}),
          ...(registeredAddress.trim()
            ? { registeredAddress: registeredAddress.trim() }
            : {}),
          // 营业执照：上传成功后才有 URL；提交的是 URL 而不是文件本身
          ...(license ? { businessLicenseUrl: license.url } : {}),
        },
        msg.registerFailed,
      );
      setSubmittedEmail(email.trim());
    } catch (error) {
      const text = resolveAuthError(error, msg.registerFailed, msg.network);
      setFormError(text);
      Toast.error(text);
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedEmail) {
    // 结果态只有一段文案 + 一个按钮，摆在 680 宽的卡里会显得空 —— 收回到其他认证页的 420
    return (
      <div className="mx-auto w-full max-w-[420px]">
        <AuthHeading title={copy.doneTitle} />
        <AuthNotice tone="success">{copy.doneBody}</AuthNotice>

        <p className="mt-5 text-body text-ink-600">
          {copy.doneAccount}
          <span className="font-semibold break-all text-ink-900">{submittedEmail}</span>
          {copy.doneAfter}
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Button
            htmlType="button"
            variant="primary"
            size="lg"
            block
            onClick={() => router.push(homeHref)}
          >
            {copy.doneAction}
          </Button>
          <Link
            href={loginHref}
            className="text-center text-sub font-semibold text-jade-700 transition-colors duration-[var(--t-fast)] hover:text-jade-800"
          >
            {copy.toLogin}
          </Link>
        </div>
      </div>
    );
  }

  /** 「获取验证码」按钮：挂在验证码字段的 label 行右侧，控件本身不加宽 */
  const codeButton = (
    <Button
      htmlType="button"
      variant="outline"
      size="sm"
      loading={sendingCode}
      disabled={sendingCode || countdown > 0 || submitting}
      onClick={handleSendCode}
    >
      {countdown > 0
        ? `${copy.resendPrefix}${countdown}${copy.resendSuffix}`
        : sendingCode
          ? copy.sendingCode
          : copy.sendCode}
    </Button>
  );

  return (
    <>
      <AuthHeading title={copy.title} subtitle={copy.subtitle} />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/*
          两列栅格：`sm` 以下堆叠（手机放不下并排两个输入框，硬并会把占位文案挤碎）；
          注册地址与营业执照横向占满 —— 地址是长文本、上传区本身是个宽虚线块，
          塞进半栏既难认也难拖。

          手机号与验证码**成对相邻**：验证码的「获取验证码」按钮就在它的 label 行右侧，
          两者被其他字段隔开会让人找不到按钮。
        */}
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field
            label={field.email}
            placeholder={field.emailPlaceholder}
            value={email}
            onValueChange={(value) => {
              setEmail(value);
              clearError("email");
            }}
            error={errors.email}
            hint={field.emailHint}
            required
            inputMode="email"
            autoComplete="email"
            maxLength={254}
          />

          <Field
            label={field.companyName}
            placeholder={field.companyNamePlaceholder}
            value={companyName}
            onValueChange={(value) => {
              setCompanyName(value);
              clearError("companyName");
            }}
            error={errors.companyName}
            hint={field.companyNameHint}
            required
            maxLength={256}
            autoComplete="organization"
          />

          <Field
            label={field.phone}
            placeholder={field.phonePlaceholder}
            value={phone}
            onValueChange={(value) => {
              setPhone(value);
              clearError("phone");
            }}
            error={errors.phone}
            hint={field.phoneHint}
            required
            inputMode="tel"
            autoComplete="tel"
            maxLength={11}
          />

          <Field
            label={field.smsCode}
            labelExtra={codeButton}
            placeholder={field.smsCodePlaceholder}
            value={smsCode}
            onValueChange={(value) => {
              setSmsCode(value);
              clearError("smsCode");
            }}
            error={errors.smsCode}
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />

          <Field
            label={field.creditCode}
            placeholder={field.creditCodePlaceholder}
            value={creditCode}
            onValueChange={(value) => {
              setCreditCode(value);
              clearError("creditCode");
            }}
            error={errors.creditCode}
            maxLength={32}
          />

          <Field
            label={field.legalPerson}
            placeholder={field.legalPersonPlaceholder}
            value={legalPerson}
            onValueChange={setLegalPerson}
            maxLength={64}
            autoComplete="name"
          />

          <Field
            label={field.registeredAddress}
            placeholder={field.registeredAddressPlaceholder}
            value={registeredAddress}
            onValueChange={setRegisteredAddress}
            multiline
            rows={2}
            maxLength={500}
            autoComplete="street-address"
            className="sm:col-span-2"
          />

          <Uploader
            label={field.license}
            hint={field.licenseHint}
            value={license}
            onChange={setLicense}
            onUploadingChange={setLicenseUploading}
            upload={(file) =>
              // 后端 §7.5a：默认 module 就是 enterprise-license（营业执照）
              uploadWebFile(file, { fallbackMessage: msg.uploadFailed })
            }
            actionText={copy.uploadAction}
            constraintText={copy.uploadConstraint}
            uploadingText={copy.uploading}
            doneText={copy.uploadDone}
            removeText={copy.uploadRemove}
            previewText={copy.uploadPreview}
            previewTitle={copy.uploadPreviewTitle}
            closeText={copy.close}
            failedText={msg.uploadFailed}
            className="sm:col-span-2"
          />
        </div>

        {formError && <AuthNotice tone="error">{formError}</AuthNotice>}

        <div className="flex flex-col gap-2">
          <Switch
            checked={agreed}
            onChange={(next) => {
              setAgreed(next);
              if (next) setFormError(null);
            }}
          >
            {copy.agree}
          </Switch>
        </div>

        <Button
          htmlType="submit"
          variant="primary"
          size="lg"
          block
          loading={submitting}
          disabled={submitting || licenseUploading}
        >
          {submitting ? copy.submitting : copy.submit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sub text-ink-500">
        {copy.hasAccount}{" "}
        <Link
          href={loginHref}
          className="font-semibold text-jade-700 transition-colors duration-[var(--t-fast)] hover:text-jade-800"
        >
          {copy.toLogin}
        </Link>
      </p>
    </>
  );
}
