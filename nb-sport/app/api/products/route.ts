import { NextRequest, NextResponse } from "next/server";
import { getProducts, createProduct } from "@/lib/server/store";

export async function GET() {
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const product = await createProduct(body);
  return NextResponse.json(product, { status: 201 });
}
