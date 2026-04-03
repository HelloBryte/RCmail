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

  // attach 字段存的是 userId
  const userId = params.attach;
  if (!userId) {
    return new Response("missing userId in attach", { status: 400 });
  }

  const db = getDb();

  // 升级或创建 Business 计划
  await db
    .insert(userPlans)
    .values({ userId, planType: "business", trialUsed: 0, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPlans.userId,
      set: { planType: "business", updatedAt: new Date() },
    });

  console.log(`用户 ${userId} 已升级为 Business，订单号: ${params.trade_order_id}`);

  // 虎皮椒要求返回 "success" 字符串表示回调已收到
  return new Response("success");
}
