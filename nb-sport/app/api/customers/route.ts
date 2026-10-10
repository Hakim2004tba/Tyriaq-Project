import { NextResponse } from "next/server";
import { getCustomers } from "@/lib/server/store";

export async function GET() {
  const customers = await getCustomers();
  return NextResponse.json(customers);
}
