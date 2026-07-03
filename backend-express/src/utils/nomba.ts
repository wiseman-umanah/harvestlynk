import { createHmac } from "node:crypto";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const NOMBAS = {
  sandbox: "https://sandbox.nomba.com",
  production: "https://api.nomba.com",
} as const;

type NombaEnvironment = keyof typeof NOMBAS;

type NombaResponse<T> = {
  code: string;
  description: string;
  data: T;
  status?: boolean | string;
  message?: string;
};

function getNombaClientId() { return getRequiredEnv("NOMBA_CLIENT_ID"); }
function getNombaClientSecret() { return getRequiredEnv("NOMBA_CLIENT_SECRET"); }
function getNombaParentAccountId() { return getRequiredEnv("NOMBA_PARENT_ACCOUNT_ID"); }
function getNombaWebhookSecret() { return getRequiredEnv("NOMBA_WEBHOOK_SECRET"); }

const NOMBA_SUB_ACCOUNT_ID = process.env["NOMBA_SUB_ACCOUNT_ID"] ?? "";
const NOMBA_ENV = ((process.env["NOMBA_ENV"] ?? "sandbox").toLowerCase() as NombaEnvironment);
const NOMBAS_BASE_URL = NOMBAS[NOMBA_ENV] ?? NOMBAS.sandbox;

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

class NombaError extends Error {
  public response?: unknown;

  constructor(message: string, response?: unknown) {
    super(message);
    this.name = "NombaError";
    this.response = response;
  }
}

function formatKobo(amountKobo: number): string {
  return (amountKobo / 100).toFixed(2);
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessTokenExpiresAt - 30_000) {
    return cachedAccessToken;
  }

  const url = `${NOMBAS_BASE_URL}/v1/auth/token/issue`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accountId: getNombaParentAccountId(),
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: getNombaClientId(),
      client_secret: getNombaClientSecret(),
    }),
  });

  const payload = (await response.json()) as NombaResponse<{ access_token: string; expiresAt: string }>;
  if (!response.ok || payload.code !== "00" || !payload.data?.access_token) {
    throw new NombaError("Failed to obtain Nomba access token", payload);
  }

  cachedAccessToken = payload.data.access_token;
  const expiresAt = Date.parse(payload.data.expiresAt);
  cachedAccessTokenExpiresAt = Number.isFinite(expiresAt) ? expiresAt : now + 55 * 60 * 1000;
  return cachedAccessToken;
}

async function nombaRequest<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  const token = await getAccessToken();
  const url = `${NOMBAS_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    accountId: getNombaParentAccountId(),
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json()) as NombaResponse<T>;
  if (!response.ok || payload.code !== "00") {
    throw new NombaError(`Nomba request failed: ${payload.description ?? response.statusText}`, payload);
  }

  return payload.data;
}

export function getNombaConfig() {
  return {
    environment: NOMBA_ENV,
    parentAccountId: getNombaParentAccountId(),
    subAccountId: NOMBA_SUB_ACCOUNT_ID,
    webhookSecret: getNombaWebhookSecret(),
    baseUrl: NOMBAS_BASE_URL,
  };
}

export function verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
  const webhookSecret = getNombaWebhookSecret();
  const hmac = createHmac("sha256", webhookSecret).update(payload).digest("hex");
  return hmac === signature;
}

export async function createCheckoutLink(options: {
  amountKobo: number;
  customerEmail: string;
  orderReference: string;
  callbackUrl: string;
  customerId?: string;
  allowedPaymentMethods?: string[];
  orderMetaData?: Record<string, string>;
  tokenizeCard?: boolean;
  currency?: string;
}): Promise<{ checkoutLink: string; orderReference: string }> {
  const order: Record<string, unknown> = {
    callbackUrl: options.callbackUrl,
    customerEmail: options.customerEmail,
    amount: formatKobo(options.amountKobo),
    currency: options.currency ?? "NGN",
    orderReference: options.orderReference,
  };

  if (options.customerId) {
    order.customerId = options.customerId;
  }

  if (options.allowedPaymentMethods) {
    order.allowedPaymentMethods = options.allowedPaymentMethods;
  }

  if (options.orderMetaData) {
    order.orderMetaData = options.orderMetaData;
  }

  if (NOMBA_SUB_ACCOUNT_ID) {
    order.accountId = NOMBA_SUB_ACCOUNT_ID;
  }

  const payload = {
    order,
    tokenizeCard: options.tokenizeCard ? "true" : "false",
  };

  return nombaRequest<{ checkoutLink: string; orderReference: string }>("/v1/checkout/order", "POST", payload);
}

export async function verifyTransaction(orderReference: string): Promise<unknown> {
  return nombaRequest<unknown>("/v1/transactions/accounts/single", "POST", { orderReference });
}

export async function getNigerianBanks(): Promise<unknown> {
  return nombaRequest<unknown>("/v1/transfers/banks", "GET");
}

export async function lookupAccount(accountNumber: string, bankCode: string): Promise<unknown> {
  const payload: Record<string, unknown> = {
    accountNumber,
    bankCode,
  };

  if (NOMBA_SUB_ACCOUNT_ID) {
    payload.accountId = NOMBA_SUB_ACCOUNT_ID;
  }

  return nombaRequest<unknown>("/v1/transfers/bank/lookup", "POST", payload);
}

export async function initiateTransfer(options: {
  amountKobo: number;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  transferRef: string;
  senderName?: string;
  narration?: string;
}): Promise<unknown> {
  const payload: Record<string, unknown> = {
    amount: formatKobo(options.amountKobo),
    accountNumber: options.accountNumber,
    accountName: options.accountName,
    bankCode: options.bankCode,
    merchantTxRef: options.transferRef,
  };

  if (options.senderName) {
    payload.senderName = options.senderName;
  }

  if (options.narration) {
    payload.narration = options.narration;
  }

  if (NOMBA_SUB_ACCOUNT_ID) {
    payload.accountId = NOMBA_SUB_ACCOUNT_ID;
  }

  return nombaRequest<unknown>("/v2/transfers/bank", "POST", payload);
}
