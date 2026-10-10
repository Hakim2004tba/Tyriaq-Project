import { getOrders } from "@/lib/server/store";
import { OrdersTable } from "@/components/admin/orders-table";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await getOrders();
  return <OrdersTable initialOrders={orders} />;
}
