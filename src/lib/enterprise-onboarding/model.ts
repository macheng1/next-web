import type { UploadedFile } from "../upload-api";
export const emptyEnterprise = {
  companyName: "",
  companyShortName: "",
  creditCode: "",
  industryCode: "",
  scaleCode: "",
  contactName: "",
  contactPhone: "",
  email: "",
  registeredAddress: "",
  legalPerson: "",
  description: "",
  cityName: "",
};
export type EnterpriseValues = typeof emptyEnterprise;
export type ValidationKey =
  "required" | "email" | "phone" | "credit" | "length";
export type EnterpriseErrors = Partial<
  Record<keyof EnterpriseValues, ValidationKey>
>;
const limits: Record<keyof EnterpriseValues, number> = {
  companyName: 256,
  companyShortName: 128,
  creditCode: 18,
  industryCode: 32,
  scaleCode: 16,
  contactName: 64,
  contactPhone: 11,
  email: 254,
  registeredAddress: 500,
  legalPerson: 64,
  description: 2000,
  cityName: 64,
};
const required: (keyof EnterpriseValues)[] = [
  "companyName",
  "creditCode",
  "industryCode",
  "scaleCode",
  "contactName",
  "contactPhone",
  "email",
  "registeredAddress",
];
export function normalizeEnterprise(
  input: Record<string, unknown>,
): EnterpriseValues {
  const values = { ...emptyEnterprise };
  for (const key of Object.keys(values) as (keyof EnterpriseValues)[])
    if (typeof input[key] === "string") values[key] = input[key].trim();
  values.email = values.email.toLowerCase();
  return values;
}
export function validateEnterpriseDetails(
  values: EnterpriseValues,
): EnterpriseErrors {
  const errors: EnterpriseErrors = {};
  for (const key of required) if (!values[key].trim()) errors[key] = "required";
  for (const key of Object.keys(values) as (keyof EnterpriseValues)[])
    if (values[key].length > limits[key]) errors[key] = "length";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = "email";
  if (values.contactPhone && !/^1[3-9]\d{9}$/.test(values.contactPhone))
    errors.contactPhone = "phone";
  if (values.creditCode && !/^[0-9A-HJ-NPQRTUWXY]{18}$/.test(values.creditCode))
    errors.creditCode = "credit";
  return errors;
}
export const DRAFT_KEY = "enterprise-application-draft-v1";
export function parseEnterpriseDraft(
  raw: string | null,
): { values: EnterpriseValues; file: UploadedFile | null } | null {
  try {
    const data = JSON.parse(raw || "null");
    if (
      !data ||
      data.version !== 1 ||
      !data.values ||
      typeof data.values !== "object"
    )
      return null;
    const values = normalizeEnterprise(data.values);
    for (const key of Object.keys(values) as (keyof EnterpriseValues)[])
      values[key] = values[key].slice(0, limits[key]);
    const f = data.file;
    let file: UploadedFile | null = null;
    if (
      f &&
      typeof f.url === "string" &&
      typeof f.originalName === "string" &&
      typeof f.objectKey === "string" &&
      Number.isFinite(f.size) &&
      f.size > 0 &&
      f.size <= 10 * 1024 * 1024
    ) {
      const url = new URL(f.url);
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        f.url.length <= 500
      )
        file = {
          url: f.url,
          originalName: f.originalName.slice(0, 255),
          objectKey: f.objectKey.slice(0, 500),
          size: f.size,
        };
    }
    return { values, file };
  } catch {
    return null;
  }
}
export type EnterpriseOptions = {
  countries: { code: string; name: string }[];
  industries: { code: string; name: string }[];
  scales: { code: string; name: string }[];
};
export type EnterpriseSubmission = EnterpriseValues & {
  requestId: string;
  countryCode: "CN";
  smsCode: string;
  businessLicenseUrl: string;
  agreementAccepted: true;
};
export type EnterpriseReceipt = {
  applicationId: string;
  status: "pending" | "approved" | "rejected";
  submittedAt?: string;
};
export function validSubmission(body: Record<string, unknown>): boolean {
  const keys = [
    ...Object.keys(emptyEnterprise),
    "requestId",
    "countryCode",
    "smsCode",
    "businessLicenseUrl",
    "agreementAccepted",
  ];
  if (Object.keys(body).some((key) => !keys.includes(key))) return false;
  if (
    Object.keys(emptyEnterprise).some(
      (key) => body[key] != null && typeof body[key] !== "string",
    )
  )
    return false;
  if (Object.keys(validateEnterpriseDetails(normalizeEnterprise(body))).length)
    return false;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(body.requestId),
    ) ||
    body.countryCode !== "CN" ||
    body.agreementAccepted !== true ||
    !/^\d{6}$/.test(String(body.smsCode))
  )
    return false;
  try {
    const url = new URL(String(body.businessLicenseUrl));
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.href.length <= 500
    );
  } catch {
    return false;
  }
}
