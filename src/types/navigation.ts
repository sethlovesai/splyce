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
  };
  AddParticipants: {
    items: ReceiptItem[];
    restaurantName: string;
    totals: Totals;
  };
  SelectItems: {
    items: ReceiptItem[];
    participants: string[];
    restaurantName: string;
    totals: Totals;
  };
  Summary: {
    summary: SummaryEntry[];
    restaurantName: string;
    totals: Totals;
  };
  Settings: undefined;
};
