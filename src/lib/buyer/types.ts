export type Unit = "piece" | "set" | "kg" | "meter";
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore?: boolean;
}
export interface DraftItem {
  enterpriseId: string;
  productId?: string;
  variantId?: string;
  name: string;
  specification: string;
  quantity: string;
  unit: Unit;
}
export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdSource?: string | null;
}
export interface InquiryDraft {
  retry?: { body: string; key: string };
  fromList?: boolean;
  enterpriseId: string;
  subject: string;
  description: string;
  contactName: string;
  contactPhone: string;
  buyerCompanyName?: string;
  expectedDate?: string;
  orderKind: "standard" | "custom";
  items: DraftItem[];
  attachments: Attachment[];
}
export interface Inquiry {
  id: string;
  number: string;
  version: number;
  enterpriseId: string;
  enterpriseName: string;
  enterpriseNameEn?: string | null;
  enterpriseLogoUrl?: string;
  buyerAvatarUrl?: string;
  buyerNickname?: string;
  subject: string;
  description: string;
  contactName: string;
  contactPhone: string;
  buyerCompanyName?: string;
  expectedDate?: string;
  orderKind: string;
  items: {
    id: string;
    product: {
      productId?: string;
      variantId?: string;
      enterpriseId: string;
      translations?: {
        en?: { name?: string | null; specification?: string | null };
      };
      name: string;
      specification: string;
      unit: Unit;
      imageUrl?: string;
    };
    quantity: string;
  }[];
  attachments: Attachment[];
  status: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  activeOrderId?: string;
  createdSource?: string | null;
  updatedSource?: string | null;
  actions: { code: string; enabled: boolean; reason?: string }[];
}
export interface Message {
  id: string;
  sequence: number;
  sender: {
    actorType: string;
    actorId: string;
    displayName: string;
    avatarUrl?: string;
  };
  text: string | null;
  kind: string;
  attachments: Attachment[];
  createdAt: string;
  recipientRead?: boolean;
  quote?: { id: string; status: string; currency: string; totalAmount: string };
}
export interface Quote {
  id: string;
  number: string;
  revision: number;
  status: string;
  currency: string;
  totalAmount: string;
  freightAmount?: string;
  taxAmount?: string;
  terms?: Record<string, unknown>;
  createdAt: string;
  items: {
    id: string;
    name: string;
    specification: string;
    unit: string;
    quantity: string;
    unitPrice: string;
    subtotal: string;
    product?: {
      name: string;
      specification: string;
      unit?: Unit;
      translations?: {
        en?: { name?: string | null; specification?: string | null };
      };
    };
  }[];
  [key: string]: unknown;
}
export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  relatedType?: string;
  relatedId?: string;
  createdAt: string;
}
export interface Summary {
  pendingInquiries: number;
  unreadMessages: number;
  unreadNotifications: number;
  savedProducts: number;
  savedEnterprises: number;
}
export interface TradeProduct {
  id: string;
  enterpriseId: string;
  name: string;
  canInquire: boolean;
  unavailableReason?: string;
  variants: { id: string; specification: string; unit: Unit }[];
}
