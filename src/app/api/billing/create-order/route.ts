import { auth } from "@clerk/nextjs/server";
import { createPaymentOrder } from "@/lib/hupijiao";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const appid = process.env.HUPIJIAO_APPID;
  const appSecret = process.env.HUPIJIAO_APPSECRET;
  if (!appid || !appSecret) {
    return Response.json({ error: "Payment not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as { plan?: string };
  const planType = body.plan === "yearly" ? "yearly" : "monthly";

  const origin = new URL(req.url).origin;

  let price: string;
  let title: string;
  if (planType === "yearly") {
    price = process.env.HUPIJIAO_YEARLY_PRICE ?? process.env.HUPIJIAO_BUSINESS_PRICE ?? "99";
    title = "RCmail Business 尊享年卡";
  } else {
    price = process.env.HUPIJIAO_MONTHLY_PRICE ?? process.env.HUPIJIAO_BUSINESS_PRICE ?? "14.9";
    title = "RCmail Business 标准月卡";
  }

  try {
    const order = await createPaymentOrder({
      userId,
      amount: price,
      title,
      notifyUrl: `${origin}/api/billing/notify`,
      returnUrl: `${origin}/pricing`,
      planType,
    });

    return Response.json({ urlQrcode: order.urlQrcode, url: order.url, orderId: order.orderId, price });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "下单失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}

