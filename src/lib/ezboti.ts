import jwt, { type SignOptions } from "jsonwebtoken";
import { randomBytes } from "crypto";

const BASE_URL = "https://revenue.ezboti.com/api/v1/server";

function makeNonce(): string {
  return randomBytes(16).toString("hex"); // 32 hex chars
}

async function callEzboti(
  method: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const projectId = process.env.EZBOTI_PROJECT_ID;
  const projectSecret = process.env.EZBOTI_PROJECT_SECRET;

  if (!projectId || !projectSecret) {
    throw new Error("EZBOTI_PROJECT_ID and EZBOTI_PROJECT_SECRET are required");
  }

  const payload = {
    method,
    params,
    exp: Math.floor(Date.now() / 1000) + 30 * 60,
    nonce: makeNonce(),
  };

  const signOptions: SignOptions = {
    algorithm: "HS256",
    header: { alg: "HS256", typ: "JWT", project_id: projectId } as jwt.JwtHeader,
  };

  const token = jwt.sign(payload, projectSecret, signOptions);

  const res = await fetch(`${BASE_URL}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: token,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ezboti ${res.status}: ${errText}`);
  }

  const responseToken = await res.text();
  const decoded = jwt.verify(responseToken, projectSecret) as Record<string, unknown>;
  return (decoded.result as Record<string, unknown>) ?? {};
}

export type CustomerInfo = {
  isBusiness: boolean;
  expireAt: string | null;
  paywallUrl: string;
};

export async function getCustomerInfo(userId: string): Promise<CustomerInfo> {
  const paywallId = process.env.EZBOTI_PAYWALL_ID;

  if (!paywallId) {
    // Paywall not configured yet — treat everyone as personal
    return { isBusiness: false, expireAt: null, paywallUrl: "" };
  }

  const result = await callEzboti("customer.info", {
    paywall_id: paywallId,
    customer: { external_id: userId },
    include_balance: true,
  });

  const balances = result?.balance_s as Array<Record<string, unknown>> | undefined;
  const balance = balances?.[0];
  const isBusiness = balance?.is_balance_usable === true;
  const expireAt =
    balance?.is_balance_infinite === true
      ? "永久"
      : typeof balance?.balance_text === "string"
      ? balance.balance_text
      : null;
  const homeLink = result?.home_link as Record<string, unknown> | undefined;
  const paywallUrl = typeof homeLink?.url === "string" ? homeLink.url : "";

  return { isBusiness, expireAt, paywallUrl };
}
