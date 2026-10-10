import { NextRequest, NextResponse } from "next/server";
import { getPromotions, createPromotion } from "@/lib/server/store";

export async function GET() {
  const promotions = await getPromotions();
  return NextResponse.json(promotions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const promotion = await createPromotion(body);
  return NextResponse.json(promotion, { status: 201 });
}
