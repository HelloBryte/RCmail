import { createHash, randomBytes } from "crypto";

const GATEWAY = "https://api.xunhupay.com/payment/do.html";

function makeNonce(): string {
  return randomBytes(16).toString("hex").slice(0, 32);
}

/** MD5 hash of sorted key=value pairs + APPSECRET (虎皮椒签名算法) */
function sign(params: Record<string, string | number>, appSecret: string): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  return createHash("md5")
    .update(sorted + appSecret)
    .digest("hex");
}

export type CreateOrderResult = {
  /** QR code image URL for PC (Alipay/WeChat scan) */
  urlQrcode: string;
  /** Mobile redirect URL */
  url: string;
  orderId: string;
};

export async function createPaymentOrder(opts: {
  userId: string;
  amount: string; // e.g. "29"
  title: string;
  notifyUrl: string;
  returnUrl: string;
  planType: string; // 'monthly' | 'yearly'
}): Promise<CreateOrderResult> {
  const appid = process.env.HUPIJIAO_APPID?.trim();
  const appSecret = process.env.HUPIJIAO_APPSECRET?.trim();

  if (!appid || !appSecret) {
    throw new Error("HUPIJIAO_APPID and HUPIJIAO_APPSECRET are required");
  }

  const tradeOrderId = `${opts.userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}_${Date.now()}`;
  const nonce = makeNonce();
  const time = Math.floor(Date.now() / 1000);

  const params: Record<string, string | number> = {
    version: "1.1",
    appid,
    trade_order_id: tradeOrderId,
    total_fee: opts.amount,
    title: opts.title,
    time,
    notify_url: opts.notifyUrl,
    return_url: opts.returnUrl,
    attach: `${opts.userId}:${opts.planType}`, // echoed back in webhook to identify user and plan
    nonce_str: nonce,
  };

  params.hash = sign(params, appSecret);

  const body = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  );

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json()) as {
    errcode: number;
    errmsg: string;
    url_qrcode?: string;
    url?: string;
    openid?: string;
  };

  if (data.errcode !== 0) {
    throw new Error(`虎皮椒下单失败: ${data.errmsg}`);
  }

  return {
    urlQrcode: data.url_qrcode ?? "",
    url: data.url ?? "",
    orderId: tradeOrderId,
  };
}

/** Verify the HMAC signature from 虎皮椒 callback */
export function verifyNotify(
  params: Record<string, string>,
  appSecret: string
): boolean {
  const received = params.hash;
  if (!received) return false;
  const { hash: _hash, ...rest } = params;
  const computed = sign(
    Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== "")) as Record<string, string>,
    appSecret
  );
  return computed === received;
}
