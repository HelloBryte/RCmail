import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userPlans } from "@/lib/db/schema";
import { verifyNotify } from "@/lib/hupijiao";

export async function POST(req: Request) {
  const appSecret = process.env.HUPIJIAO_APPSECRET;
  if (!appSecret) {
    return new Response("Payment not configured", { status: 503 });
  }

  // 虎皮椒回调使用 form-urlencoded
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  // 验签
  if (!verifyNotify(params, appSecret)) {
    console.error("虎皮椒回调签名验证失败", params);
    return new Response("invalid sign", { status: 400 });
  }

  // 只处理已支付状态
  if (params.status !== "OD") {
    return new Response("success");
  }

  // attach 字段格式: userId:planType
  const [userId, planVariant] = (params.attach ?? "").split(":");
  if (!userId) {
    return new Response("missing userId in attach", { status: 400 });
  }

  const variant = planVariant === "yearly" ? "yearly" : "monthly";
  const expiry = variant === "yearly"
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const db = getDb();

  await db
    .insert(userPlans)
    .values({ userId, planType: "business", planVariant: variant, planExpiry: expiry, trialUsed: 0, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPlans.userId,
      set: { planType: "business", planVariant: variant, planExpiry: expiry, updatedAt: new Date() },
    });

  console.log(`用户 ${userId} 已升级为 Business (${variant})，订单号: ${params.trade_order_id}`);

  // 虎皮椒要求返回 "success" 字符串表示回调已收到
  return new Response("success");
}
