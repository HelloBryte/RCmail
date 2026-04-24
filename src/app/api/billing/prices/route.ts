export async function GET() {
  const monthly = process.env.HUPIJIAO_MONTHLY_PRICE ?? process.env.HUPIJIAO_BUSINESS_PRICE ?? "14.9";
  const yearly = process.env.HUPIJIAO_YEARLY_PRICE ?? process.env.HUPIJIAO_BUSINESS_PRICE ?? "99";
  return Response.json({ monthly, yearly });
}
