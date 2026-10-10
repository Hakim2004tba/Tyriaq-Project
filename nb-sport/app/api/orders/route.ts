import { NextRequest, NextResponse } from "next/server";
import { getOrders, createOrder } from "@/lib/server/store";

export async function GET() {
  const orders = await getOrders();
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const order = await createOrder(body);
  return NextResponse.json(order, { status: 201 });
}
