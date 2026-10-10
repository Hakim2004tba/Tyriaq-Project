import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  nouvelle: "Nouvelle commande",
  preparation: "En préparation",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
};

const VARIANTS: Record<OrderStatus, "accent" | "neutral" | "danger" | "warning" | "outline"> = {
  nouvelle: "outline",
  preparation: "warning",
  expediee: "neutral",
  livree: "accent",
  annulee: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANTS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
