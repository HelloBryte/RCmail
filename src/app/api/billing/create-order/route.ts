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

  const origin = new URL(req.url).origin;
  const price = process.env.HUPIJIAO_BUSINESS_PRICE ?? "29";

  try {
    const order = await createPaymentOrder({
      userId,
      amount: price,
      title: "RCmail Business 会员",
      notifyUrl: `${origin}/api/billing/notify`,
      returnUrl: `${origin}/pricing`,
    });

    return Response.json({ urlQrcode: order.urlQrcode, url: order.url, orderId: order.orderId, price });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "下单失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}
