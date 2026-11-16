export type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type Totals = {
  subtotal: number;
  tax: number;
  tip: number;
  serviceCharge?: number;
  total?: number;
  taxRate?: number; // percentage (0-100) for convenience
};

export type SummaryEntry = {
  name: string;
  itemsCount: number;
  totalOwed: number;
  taxAmount?: number;
  taxRate?: number;
  items?: {
    name: string;
    share: number;
  }[];
};

export type RootStackParamList = {
  Home: undefined;
  ScanReceipt: {
    imageUri?: string;
    imageBase64?: string;
  } | undefined;
  ReceiptReview: {
    items: ReceiptItem[];
    restaurantName: string;
    totals: Totals;
    mismatchWarning?: {
      computedSubtotal: number;
      parsedSubtotal: number;
      delta: number;
    };
    // LLM-suggested spending category from the OCR parse — carried through to
    // Summary to pre-select the category picker; always user-overridable.
    suggestedCategory?: string;
  };
  BillHistory: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  ReviewSelections: {
    items: ReceiptItem[];
    selections: Record<string, string[]>;
    participants: string[];
    restaurantName: string;
    totals: Totals;
    summary: SummaryEntry[];
    suggestedCategory?: string;
  };
  AddParticipants: {
    items: ReceiptItem[];
    restaurantName: string;
    totals: Totals;
    suggestedCategory?: string;
  };
  SelectItems: {
    items: ReceiptItem[];
    participants: string[];
    restaurantName: string;
    totals: Totals;
    sessionId?: string; // present when a live session was started on the participants screen
    suggestedCategory?: string;
  };
  Summary: {
    summary: SummaryEntry[];
    restaurantName: string;
    totals: Totals;
    suggestedCategory?: string;
  };
  Settings: undefined;
  Paywall: undefined;
  Analytics: undefined;
};
