import {AccountSettings} from "@/src/components/buyer/AccountSettings";
import { BuyerShell } from "@/src/components/buyer/BuyerShell";
import { Overview } from "@/src/components/buyer/Overview";
import { InquiryList } from "@/src/components/buyer/InquiryList";
import { SourcingList } from "@/src/components/buyer/SourcingList";
import { SavedItems } from "@/src/components/buyer/SavedItems";
import { InquiryForm } from "@/src/components/buyer/InquiryForm";
import { InquiryConversation } from "@/src/components/buyer/InquiryConversation";
import { QuoteDetail } from "@/src/components/buyer/QuoteDetail";
import { MessageCenter } from "@/src/components/buyer/MessageCenter";
import { memberId, enterpriseId, inquiryId, quoteId } from "./buyer-test-data";
export function BuyerFixture({ screen }: { screen: string }) {
  return (
    <BuyerShell
      member={{
        id: memberId,
        email: "buyer@example.com",
        nickname: "Alex",
        memberType: "personal",
        avatarUrl: null,
        mustChangePassword: false,
        emailVerified: true,
        hasPassword: true,
      }}
    >
      {screen === "settings" ? <AccountSettings/> : screen === "inquiries" ? (
        <InquiryList />
      ) : screen === "list" ? (
        <SourcingList />
      ) : screen === "saved" ? (
        <SavedItems />
      ) : screen === "new" ? (
        <InquiryForm enterpriseId={enterpriseId} />
      ) : screen === "detail" ? (
        <InquiryConversation id={inquiryId} />
      ) : screen === "quote" ? (
        <QuoteDetail id={quoteId} />
      ) : screen === "messages" ? (
        <MessageCenter />
      ) : (
        <Overview />
      )}
    </BuyerShell>
  );
}
