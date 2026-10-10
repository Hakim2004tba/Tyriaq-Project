import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.87.24-1.46 1.5-1.46H16.5V4.36c-.26-.03-1.16-.11-2.2-.11-2.18 0-3.68 1.33-3.68 3.77V10.5H8v3h2.62V21h2.88z" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const COLUMNS = [
  {
    title: "Boutique",
    links: [
      { href: "/produits", label: "Tous les produits" },
      { href: "/categories", label: "Catégories" },
      { href: "/promotions", label: "Promotions" },
      { href: "/nouveautes", label: "Nouveautés" },
    ],
  },
  {
    title: "Service client",
    links: [
      { href: "/suivre-commande", label: "Suivre ma commande" },
      { href: "/contact", label: "Contact" },
      { href: "/a-propos", label: "À propos" },
      { href: "/compte", label: "Mon compte" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg nb-gradient-accent font-black text-accent-foreground">
                NB
              </span>
              <span className="text-lg font-black">
                NB <span className="text-accent-strong">SPORT</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Des produits sportifs authentiques pensés pour accompagner chaque athlète, à chaque mouvement.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-accent-strong hover:text-accent-strong"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-accent-strong hover:text-accent-strong"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted transition-colors hover:text-accent-strong">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">Contact</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" /> Alger, Algérie
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-accent-strong" /> +213 555 00 00 00
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-accent-strong" /> contact@nbsport.dz
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} NB SPORT. Tous droits réservés.</p>
          <p>Produits authentiques · Livraison partout en Algérie</p>
        </div>
      </div>
    </footer>
  );
}
