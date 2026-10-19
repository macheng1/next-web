import { QuoteDetail } from "@/src/components/buyer/QuoteDetail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <QuoteDetail id={(await params).id} />;
}
