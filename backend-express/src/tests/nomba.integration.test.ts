import { describe, it, expect } from "vitest";
import { createCheckoutLink, getNigerianBanks, lookupAccount, initiateTransfer, verifyWebhookSignature } from "../utils/nomba.js";
import { createHmac } from "node:crypto";

const requiredIntegrationEnv = [
  "NOMBA_CLIENT_ID",
  "NOMBA_CLIENT_SECRET",
  "NOMBA_PARENT_ACCOUNT_ID",
  "NOMBA_WEBHOOK_SECRET",
  "NOMBA_ENV",
  "NOMBA_TEST_BANK_CODE",
  "NOMBA_TEST_ACCOUNT_NUMBER",
  "NOMBA_TEST_ACCOUNT_NAME",
].every((name) => Boolean(process.env[name]));

const isSandbox = process.env["NOMBA_ENV"] === "sandbox";
const testDescription = requiredIntegrationEnv && isSandbox ? describe : describe.skip;

const transferEnabled = Boolean(
  process.env["NOMBA_TEST_TRANSFER_BANK_CODE"] &&
  process.env["NOMBA_TEST_TRANSFER_ACCOUNT_NUMBER"] &&
  process.env["NOMBA_TEST_TRANSFER_ACCOUNT_NAME"]
);

const integrationTargets = transferEnabled ? describe : describe.skip;

const testBankCode = process.env["NOMBA_TEST_BANK_CODE"]!;
const testAccountNumber = process.env["NOMBA_TEST_ACCOUNT_NUMBER"]!;
const testAccountName = process.env["NOMBA_TEST_ACCOUNT_NAME"]!;

const transferBankCode = process.env["NOMBA_TEST_TRANSFER_BANK_CODE"] ?? testBankCode;
const transferAccountNumber = process.env["NOMBA_TEST_TRANSFER_ACCOUNT_NUMBER"] ?? testAccountNumber;
const transferAccountName = process.env["NOMBA_TEST_TRANSFER_ACCOUNT_NAME"] ?? testAccountName;

const buyerEmail = process.env["NOMBA_TEST_CUSTOMER_EMAIL"] ?? "test-buyer@example.com";

const samplePayload = JSON.stringify({
  event: "payment_success",
  data: { orderReference: "TEST-REF", amount: "1000" },
});

testDescription("Nomba sandbox integration", () => {
  it("verifies webhook signatures correctly", () => {
    const secret = process.env["NOMBA_WEBHOOK_SECRET"]!;
    const signature = createHmac("sha256", secret).update(samplePayload).digest("hex");

    expect(verifyWebhookSignature(samplePayload, signature)).toBe(true);
    expect(verifyWebhookSignature(samplePayload, "invalid-signature")).toBe(false);
  });

  it("fetches bank list from Nomba", async () => {
    const banks = await getNigerianBanks();
    expect(Array.isArray(banks)).toBe(true);
    expect((banks as any[]).length).toBeGreaterThan(0);
    expect((banks as any[])[0]).toHaveProperty("name");
    expect((banks as any[])[0]).toHaveProperty("code");
  });

  it("looks up a bank account using Nomba", async () => {
    const result = await lookupAccount(testAccountNumber, testBankCode);
    expect(result).toBeTruthy();
    const accountName = (result as any).accountName || (result as any).account_name || (result as any).account?.name;
    expect(typeof accountName).toBe("string");
    expect(accountName.length).toBeGreaterThan(0);
  });

  it("creates a checkout link using Nomba", async () => {
    const result = await createCheckoutLink({
      amountKobo: 1000,
      customerEmail: buyerEmail,
      orderReference: `TEST-${Date.now()}`,
      callbackUrl: "http://localhost:3000/dashboard/buyer/orders/test",
      customerId: "test-customer",
      allowedPaymentMethods: ["Card", "Transfer"],
      orderMetaData: { productName: "Test Product", quantity: "1" },
      tokenizeCard: false,
    });

    expect(result).toHaveProperty("checkoutLink");
    expect(typeof result.checkoutLink).toBe("string");
    expect(result.checkoutLink.length).toBeGreaterThan(0);
    expect(result).toHaveProperty("orderReference");
  });
});

integrationTargets("Nomba sandbox transfer integration", () => {
  it("initiates a transfer through Nomba", async () => {
    const result = await initiateTransfer({
      amountKobo: 1000,
      accountNumber: transferAccountNumber,
      accountName: transferAccountName,
      bankCode: transferBankCode,
      transferRef: `TEST_TRANSFER_${Date.now()}`,
      senderName: "HarvestLynk Test",
      narration: "Sandbox payout test",
    });

    expect(result).toBeTruthy();
    // Nomba may return different field names depending on API version / response shape.
    // Accept any of the common keys and assert the transfer ref is present.
    const maybeRef = (result as any).merchantTxRef || (result as any).merchant_tx_ref || (result as any).merchant_reference || (result as any).reference || (result as any).meta?.merchantTxRef || (result as any).meta?.merchant_tx_ref || (result as any).data?.merchantTxRef || (result as any).data?.merchant_tx_ref;
    if (!(typeof maybeRef === "string" || typeof maybeRef === "number")) {
      // Dump the full result to help diagnose unexpected response shapes
      // eslint-disable-next-line no-console
      console.error('Unexpected transfer response shape:', JSON.stringify(result, null, 2));
      throw new Error('Transfer response did not include a merchant/reference id');
    }
    expect(String(maybeRef)).toMatch(/TEST_TRANSFER_/);
  });
});
