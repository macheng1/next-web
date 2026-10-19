import { InquiryConversation } from "@/src/components/buyer/InquiryConversation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <InquiryConversation id={(await params).id} />;
}
