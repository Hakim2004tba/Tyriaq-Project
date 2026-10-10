import { User, Heart, Package, MapPin } from "lucide-react";

export const metadata = { title: "Mon compte — NB SPORT" };

export default function ComptePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
          <User className="h-8 w-8 text-accent-strong" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Mon compte</h1>
          <p className="text-sm text-muted">Gérez vos informations et vos commandes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="nb-card glow-border flex flex-col items-center gap-2 p-6 text-center">
          <Package className="h-7 w-7 text-accent-strong" />
          <p className="text-sm font-bold">Mes commandes</p>
          <p className="text-xs text-muted">Suivez vos commandes en cours et passées</p>
        </div>
        <div className="nb-card glow-border flex flex-col items-center gap-2 p-6 text-center">
          <Heart className="h-7 w-7 text-accent-strong" />
          <p className="text-sm font-bold">Mes favoris</p>
          <p className="text-xs text-muted">Retrouvez les produits que vous aimez</p>
        </div>
        <div className="nb-card glow-border flex flex-col items-center gap-2 p-6 text-center">
          <MapPin className="h-7 w-7 text-accent-strong" />
          <p className="text-sm font-bold">Mes adresses</p>
          <p className="text-xs text-muted">Gérez vos adresses de livraison</p>
        </div>
      </div>

      <div className="nb-card mt-8 p-6 text-center text-sm text-muted">
        Connectez-vous via votre numéro de commande dans{" "}
        <a href="/suivre-commande" className="font-semibold text-accent-strong">
          Suivre ma commande
        </a>{" "}
        pour consulter le détail d&apos;un achat.
      </div>
    </div>
  );
}
