import { NextRequest, NextResponse } from "next/server";
import { getCategories, createCategory } from "@/lib/server/store";

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const category = await createCategory(body);
  return NextResponse.json(category, { status: 201 });
}
