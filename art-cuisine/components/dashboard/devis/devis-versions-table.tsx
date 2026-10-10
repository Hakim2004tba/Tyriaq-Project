import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import type { DevisVersionRecord } from "@/lib/data/operations";

function DevisVersionsTable({ versions }: { versions: DevisVersionRecord[] }) {
  return (
    <Table className="border-none">
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>Projet</TableHead>
          <TableHead>Statut au moment de la révision</TableHead>
          <TableHead>Motif</TableHead>
          <TableHead>Par</TableHead>
          <TableHead>Le</TableHead>
          <TableHead className="text-right">Montant</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versions.map((v) => (
          <TableRow key={v.id}>
            <TableCell className="font-medium text-text-secondary">v{v.version}</TableCell>
            <TableCell>{v.projectLabel}</TableCell>
            <TableCell className="text-text-secondary">{v.status}</TableCell>
            <TableCell className="max-w-xs text-text-secondary">{v.note}</TableCell>
            <TableCell className="text-text-secondary">{v.createdBy}</TableCell>
            <TableCell className="text-text-secondary">{formatShortDate(v.createdAt)}</TableCell>
            <TableCell className="text-right font-medium">{formatCurrencyDA(v.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { DevisVersionsTable };
