import { requestJson } from "../http/request";
import type {
  EnterpriseOptions,
  EnterpriseReceipt,
  EnterpriseSubmission,
} from "./model";
export const getEnterpriseOptions = (signal?: AbortSignal) =>
  requestJson<EnterpriseOptions>("/api/enterprise/applications/options", {
    signal,
  });
export const sendEnterpriseSms = (phone: string) =>
  requestJson("/api/enterprise/applications/sms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone }),
  });
export const submitEnterpriseApplication = (data: EnterpriseSubmission) =>
  requestJson<EnterpriseReceipt>("/api/enterprise/applications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
