const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

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
  locationState?: string;
  locationLga?: string;
  locationVillage?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  preferredLanguage?: string;
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
  images: unknown | null;
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
  status?: "active" | "paused";
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
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      if (text) {
        const body = JSON.parse(text);
        // Prefer field-level validation details over the generic top-level message
        if (body.details && typeof body.details === "object") {
          const fieldErrors = Object.entries(body.details as Record<string, string[]>)
            .map(([field, msgs]) => {
              const label = field.charAt(0).toUpperCase() + field.slice(1);
              return `${label}: ${msgs.join(", ")}`;
            })
            .join(" | ");
          if (fieldErrors) {
            message = fieldErrors;
          }
        } else if (typeof body.message === "string") {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = body.message.join(", ");
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
    apiFetch<{ user: { id: string; email: string; name: string }; session: unknown }>(
      "/api/auth/sign-in/email",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  signOut: () =>
    apiFetch<void>("/api/auth/sign-out", { method: "POST" }),

  loginWithGoogle: async (callbackURL: string) => {
    const res = await apiFetch<{ url: string }>("/api/auth/sign-in/social", {
      method: "POST",
      body: JSON.stringify({ provider: "google", callbackURL }),
    });
    window.location.href = res.url;
  },

  getSession: () =>
    apiFetch<{ user: { id: string; email: string; name: string } | null; session: unknown | null }>(
      "/api/auth/get-session"
    ),
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  signup: (data: SignupData) =>
    apiFetch<User>("/users/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getUser: (id: string) =>
    apiFetch<User>(`/users/${id}`),

  updateUser: (data: UpdateProfileData) =>
    apiFetch<User>("/users/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  completeOAuthProfile: (data: { role: "farmer" | "buyer"; farmName?: string; location?: string; phoneNumber?: string }) =>
    apiFetch<User>("/users/complete-oauth", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Wallet API ───────────────────────────────────────────────────────────────

export const walletApi = {
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
  getAllListings: (filters?: { category?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.search) params.set("search", filters.search);
    const qs = params.toString();
    return apiFetch<PublicListing[]>(`/marketplace/listings${qs ? `?${qs}` : ""}`);
  },

  createListing: (data: CreateListingData) =>
    apiFetch<Listing>("/marketplace/listings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyListings: () =>
    apiFetch<Listing[]>("/marketplace/listings/my"),

  deleteListing: (id: string) =>
    apiFetch<void>(`/marketplace/listings/${id}`, { method: "DELETE" }),
};

// ─── Orders API ───────────────────────────────────────────────────────────────

export interface BuyerOrder {
  order_id: string;
  farmer_id: string;
  quantity: string;
  unit_price: number;
  total_amount: number;
  delivery_method: string;
  delivery_address: string | null;
  special_instructions: string | null;
  status: "pending_payment" | "processing" | "completed" | "cancelled" | "disputed";
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
  buyer_id: string;
  quantity: string;
  unit_price: number;
  total_amount: number;
  delivery_method: string;
  delivery_address: string | null;
  status: "pending_payment" | "processing" | "completed" | "cancelled" | "disputed";
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
};
