import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { processedPayments, userPlans } from "@/lib/db/schema";
import { verifyNotify } from "@/lib/hupijiao";
import { extendExpiry } from "@/lib/plans";

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
    console.error("虎皮椒回调签名验证失败", params.trade_order_id);
    return new Response("invalid sign", { status: 400 });
  }

  // 只处理已支付状态
  if (params.status !== "OD") {
    return new Response("success");
  }

  const tradeOrderId = params.trade_order_id;
  if (!tradeOrderId) {
    return new Response("missing trade_order_id", { status: 400 });
  }

  // attach 字段格式: userId:planType
  const [userId, planVariant] = (params.attach ?? "").split(":");
  if (!userId) {
    return new Response("missing userId in attach", { status: 400 });
  }

  const variant = planVariant === "yearly" ? "yearly" : "monthly";
  const db = getDb();

  // 幂等：同一订单号只入账一次。重复回调与重放的报文签名同样有效，
  // 仅靠验签无法阻止重复升级，必须以订单号去重。
  const [claimed] = await db
    .insert(processedPayments)
    .values({ tradeOrderId, userId, planVariant: variant, totalFee: params.total_fee ?? null })
    .onConflictDoNothing({ target: processedPayments.tradeOrderId })
    .returning();

  if (!claimed) {
    console.log(`订单 ${tradeOrderId} 已处理过，跳过重复回调`);
    return new Response("success");
  }

  const [existing] = await db.select().from(userPlans).where(eq(userPlans.userId, userId)).limit(1);

  // 已是永久卡则不覆盖，其余情况从剩余有效期往后顺延
  if (existing?.planType === "business" && existing.planVariant === "lifetime") {
    console.log(`用户 ${userId} 为永久卡，订单 ${tradeOrderId} 不改变有效期`);
    return new Response("success");
  }

  const expiry = extendExpiry(existing?.planExpiry, variant);

  await db
    .insert(userPlans)
    .values({ userId, planType: "business", planVariant: variant, planExpiry: expiry, trialUsed: 0, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPlans.userId,
      set: { planType: "business", planVariant: variant, planExpiry: expiry, updatedAt: new Date() },
    });

  console.log(`用户 ${userId} 已升级为 Business (${variant})，到期 ${expiry.toISOString()}，订单号: ${tradeOrderId}`);

  // 虎皮椒要求返回 "success" 字符串表示回调已收到
  return new Response("success");
}
