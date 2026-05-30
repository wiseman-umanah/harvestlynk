const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletBalance {
  wallet_id?: string;
  user_id?: string;
  available_balance: string; // Kobo as string
  pending_balance: string;
  total_paid_in: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phoneNumber: string | null;
  role: "farmer" | "buyer";
  farmName: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  location_state: string | null;
  location_lga: string | null;
  location_village: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  liveness_verified: boolean;
  trust_score: number;
  preferred_language: string | null;
  wallet: WalletBalance | null;
  bio?: string | null;
}

export interface Transaction {
  transaction_id: string;
  wallet_id: string;
  user_id: string;
  type: "credit" | "debit";
  amount: string; // Kobo
  balance_before: string;
  balance_after: string;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

export interface SignupData {
  role: "farmer" | "buyer";
  fullName: string;
  email: string;
  farmName: string;
  location: string;
  phoneNumber: string;
  password: string;
}

export interface UpdateProfileData {
  fullName?: string;
  bio?: string;
  locationState?: string;
  locationLga?: string;
  locationVillage?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  preferredLanguage?: string;
  farmName?: string;
}

export interface Listing {
  listing_id: string;
  farmer_id: string;
  product_name: string;
  category: string;
  quantity: string; // Decimal as string
  unit: string;
  price_per_unit: number; // Naira
  total_price: number;    // Naira
  location_state: string;
  location_lga: string | null;
  pickup_address: string | null;
  description: string | null;
  status: "active" | "sold" | "expired" | "paused";
  views: number;
  inquiries: number;
  harvest_date: string | null;
  delivery_options: string[] | null;
  images: string[] | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateListingData {
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  location_state: string;
  location_lga?: string;
  pickup_address?: string;
  description?: string;
  harvest_date?: string | null;
  delivery_options?: string[];
  images?: string[];
  status?: "active" | "paused";
}

export interface Bank {
  name: string;
  code: string;
}

export interface WithdrawData {
  amount: number; // Kobo
  bank_name: string;
  bank_code: string;
  account_number: string;
}

export interface BankVerifyResponse {
  success: boolean;
  message: string;
  data: { account_name: string };
}

export interface WithdrawResponse {
  success: boolean;
  message: string;
  transaction_id: string;
  status: "pending" | "completed" | "failed";
}

export interface NotificationItem {
  notification_id: string;
  user_id: string;
  type: "order" | "payment" | "system";
  title: string;
  message: string;
  is_read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface Scan {
  scan_id: string;
  user_id: string;
  image_url: string;
  thumbnail_url: string | null;
  crop_type: string;
  farmer_notes: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  result_disease: string | null;
  result_confidence: number | null;
  result_severity: "low" | "medium" | "high" | null;
  result_recommendations: unknown;
  processing_time_ms: number | null;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DashboardStats {
  // Farmer
  listings_count?: number;
  orders_received?: number;
  completed_orders?: number;
  total_revenue?: number;
  // Buyer
  orders_placed?: number;
}

// ─── Money helpers ─────────────────────────────────────────────────────────────

export function koboToNaira(kobo: string | number): number {
  const n = typeof kobo === "string" ? parseInt(kobo, 10) : kobo;
  return isNaN(n) ? 0 : n / 100;
}

export function formatNaira(kobo: string | number): string {
  return `₦${koboToNaira(kobo).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

// ─── Base fetch ────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: isFormData
      ? (init?.headers ?? {})
      : { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  const text = await res.text();

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      if (text) {
        const body = JSON.parse(text);
        if (body.details && typeof body.details === "object") {
          const fieldErrors = Object.entries(body.details as Record<string, string[]>)
            .map(([field, msgs]) => {
              const label = field.charAt(0).toUpperCase() + field.slice(1);
              return `${label}: ${msgs.join(", ")}`;
            })
            .join(" | ");
          if (fieldErrors) message = fieldErrors;
        } else if (body.error) {
          message = body.error;
        } else if (typeof body.message === "string") {
          message = body.message;
        }
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  signIn: (email: string, password: string) =>
    apiFetch<{ token: string; user: { id: string; email: string; name: string } }>(
      "/api/auth/sign-in/email",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  signOut: () =>
    apiFetch<void>("/api/auth/sign-out", { method: "POST" }),

  getSession: () =>
    apiFetch<{ user: { id: string; email: string; name: string } | null; session: unknown | null }>(
      "/api/auth/get-session"
    ),

  // Google OAuth — not yet wired server-side; kept here so UI compiles
  loginWithGoogle: async (_callbackURL: string) => {
    alert("Google login is not yet configured.");
  },
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  signup: (data: SignupData) =>
    apiFetch<User>("/users/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: () =>
    apiFetch<User>("/users/me"),

  getUser: (id: string) =>
    apiFetch<User>(`/users/${id}`),

  updateUser: (data: UpdateProfileData) =>
    apiFetch<User>("/users/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getStats: () =>
    apiFetch<DashboardStats>("/users/me/stats"),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ url: string; user: User }>("/users/avatar", { method: "POST", body: form });
  },

  livenessCheck: (selfie: File) => {
    const form = new FormData();
    form.append("selfie", selfie);
    return apiFetch<{ passed: boolean; liveness_score: number; is_live: boolean; message: string }>(
      "/users/liveness-check",
      { method: "POST", body: form }
    );
  },

  uploadNinDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ url: string; user: User }>("/users/verify-nin", { method: "POST", body: form });
  },

  uploadOwnershipDoc: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ url: string; user: User }>("/users/upload-ownership-doc", { method: "POST", body: form });
  },

  completeOAuthProfile: (data: { role: "farmer" | "buyer"; farmName?: string; location?: string; phoneNumber?: string }) =>
    apiFetch<User>("/users/complete-oauth", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getFarmerRatings: (farmerId: string) =>
    apiFetch<{ farmer_id: string; average_rating: number | null; total_reviews: number; ratings: unknown[] }>(
      `/users/${farmerId}/ratings`
    ),
};

// ─── Wallet API ───────────────────────────────────────────────────────────────

export const walletApi = {
  getBanks: () =>
    apiFetch<{ banks: Bank[] }>("/wallet/banks"),

  getBalance: () =>
    apiFetch<WalletBalance>("/wallet/balance"),

  getTransactions: () =>
    apiFetch<Transaction[]>("/wallet/transactions"),

  verifyBank: (bankCode: string, accountNumber: string) =>
    apiFetch<BankVerifyResponse>(
      `/wallet/verify-bank?bank_code=${encodeURIComponent(bankCode)}&account_number=${encodeURIComponent(accountNumber)}`
    ),

  withdraw: (data: WithdrawData) =>
    apiFetch<WithdrawResponse>("/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export interface PublicListing extends Listing {
  farmer: {
    name: string;
    farmName: string | null;
    location_state: string | null;
    location_lga: string | null;
  };
}

// ─── Marketplace API ──────────────────────────────────────────────────────────

export const marketplaceApi = {
  getAllListings: async (filters?: { category?: string; search?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    const res = await apiFetch<{ data: PublicListing[]; page: number; limit: number; total: number }>(
      `/marketplace/listings${qs ? `?${qs}` : ""}`
    );
    return res.data;
  },

  getListing: (id: string) =>
    apiFetch<PublicListing>(`/marketplace/listings/${id}`),

  createListing: (data: CreateListingData) =>
    apiFetch<Listing>("/marketplace/listings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateListing: (id: string, data: Partial<CreateListingData>) =>
    apiFetch<Listing>(`/marketplace/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getMyListings: () =>
    apiFetch<Listing[]>("/marketplace/listings/my"),

  deleteListing: (id: string) =>
    apiFetch<void>(`/marketplace/listings/${id}`, { method: "DELETE" }),

  uploadImage: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    const res = await apiFetch<{ url: string }>("/marketplace/upload", {
      method: "POST",
      body: form,
    });
    return res.url;
  },
};

// ─── Orders API ───────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending_payment"
  | "payment_confirmed"
  | "processing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "disputed";

export interface BuyerOrder {
  order_id: string;
  order_ref: string;
  farmer_id: string;
  quantity: string;
  unit_price: number;
  total_amount: number;
  delivery_method: string;
  delivery_address: string | null;
  special_instructions: string | null;
  status: OrderStatus;
  escrow_state: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  listing: { product_name: string; unit: string };
  farmer: { name: string; farmName: string | null };
}

export interface CreateOrderData {
  listing_id: string;
  quantity: number;
  delivery_method: "pickup" | "delivery";
  delivery_address?: string | null;
  special_instructions?: string | null;
}

export interface FarmerOrder {
  order_id: string;
  order_ref: string;
  buyer_id: string;
  quantity: string;
  unit_price: number;
  total_amount: number;
  delivery_method: string;
  delivery_address: string | null;
  status: OrderStatus;
  escrow_state: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  listing: { product_name: string; unit: string };
  buyer: { name: string };
}

export const ordersApi = {
  createOrder: (data: CreateOrderData) =>
    apiFetch<BuyerOrder>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyBuyerOrders: () =>
    apiFetch<BuyerOrder[]>("/orders/buyer"),

  getMyFarmerOrders: () =>
    apiFetch<FarmerOrder[]>("/orders/my"),

  confirmDelivery: (orderId: string) =>
    apiFetch<{ message: string; order: { order_id: string; status: string } }>(
      `/orders/${orderId}/confirm-delivery`,
      { method: "PATCH" }
    ),

  updateStatus: (orderId: string) =>
    apiFetch<{ order_id: string; status: string; escrow_state: string }>(
      `/orders/${orderId}/status`,
      { method: "PATCH" }
    ),

  cancelOrder: (orderId: string, reason?: string) =>
    apiFetch<{ order_id: string; status: string }>(
      `/orders/${orderId}/cancel`,
      { method: "PATCH", body: JSON.stringify({ reason }) }
    ),

  rateOrder: (orderId: string, data: {
    rating: number;
    review?: string;
    quality_rating?: number;
    communication_rating?: number;
    delivery_rating?: number;
  }) =>
    apiFetch<{ rating_id: string; rating: number }>(`/orders/${orderId}/rate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Notifications API ────────────────────────────────────────────────────────

export const notificationsApi = {
  getAll: (type?: "order" | "payment" | "system") => {
    const qs = type ? `?type=${type}` : "";
    return apiFetch<NotificationItem[]>(`/notifications${qs}`);
  },

  getUnreadCount: () =>
    apiFetch<{ count: number }>("/notifications/unread-count"),

  markRead: (id: string) =>
    apiFetch<{ notification_id: string; is_read: boolean }>(`/notifications/${id}/read`, {
      method: "PATCH",
    }),

  markAllRead: () =>
    apiFetch<{ message: string }>("/notifications/read-all", { method: "PATCH" }),
};

// ─── Scans API ────────────────────────────────────────────────────────────────

export const scansApi = {
  createScan: (imageFile: File, cropType: string, notes?: string) => {
    const form = new FormData();
    form.append("image", imageFile);
    form.append("crop_type", cropType);
    if (notes) form.append("farmer_notes", notes);
    return apiFetch<Scan>("/scans", { method: "POST", body: form });
  },

  getMyScans: () =>
    apiFetch<Scan[]>("/scans/my"),
};
