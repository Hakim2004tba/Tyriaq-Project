import { getCustomers } from "@/lib/server/store";
import { formatDate, formatPrice } from "@/lib/utils";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="nb-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Users className="h-4 w-4 text-accent-strong" />
        <p className="text-sm text-muted">{customers.length} clients</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Téléphone</th>
              <th className="px-4 py-3 font-semibold">Wilaya</th>
              <th className="px-4 py-3 font-semibold">Commandes</th>
              <th className="px-4 py-3 font-semibold">Total dépensé</th>
              <th className="px-4 py-3 font-semibold">Client depuis</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-4 py-3 font-semibold">{c.nom}</td>
                <td className="px-4 py-3 text-muted">{c.telephone}</td>
                <td className="px-4 py-3 text-muted">{c.wilaya}</td>
                <td className="px-4 py-3">{c.commandes}</td>
                <td className="px-4 py-3 font-semibold text-accent-strong">{formatPrice(c.totalDepense)}</td>
                <td className="px-4 py-3 text-muted">{formatDate(c.creeLe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
