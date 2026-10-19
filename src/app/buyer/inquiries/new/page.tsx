import { InquiryForm } from "@/src/components/buyer/InquiryForm";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ enterpriseId?: string; draftId?: string }>;
}) {
  const { enterpriseId = "", draftId } = await searchParams;
  return <InquiryForm enterpriseId={enterpriseId} draftId={draftId} />;
}
