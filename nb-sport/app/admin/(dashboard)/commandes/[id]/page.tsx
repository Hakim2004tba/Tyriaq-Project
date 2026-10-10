import { notFound } from "next/navigation";
import { getOrders } from "@/lib/server/store";
import { OrderDetailPanel } from "@/components/admin/order-detail-panel";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orders = await getOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) notFound();
  return <OrderDetailPanel order={order} />;
}
