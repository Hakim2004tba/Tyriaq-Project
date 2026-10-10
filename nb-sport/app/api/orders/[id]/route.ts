import { NextRequest, NextResponse } from "next/server";
import { updateOrder } from "@/lib/server/store";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = await updateOrder(id, body);
  if (!updated) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  return NextResponse.json(updated);
}
