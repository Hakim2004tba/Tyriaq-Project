import { NextRequest, NextResponse } from "next/server";
import { deleteCategory } from "@/lib/server/store";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteCategory(id);
  return NextResponse.json({ ok: true });
}
