import Link from "next/link";
import { InstagramIcon, FacebookIcon, LinkedinIcon } from "@/components/layout/social-icons";
import { Logo } from "@/components/layout/logo";
import { Separator } from "@/components/ui/separator";

const COLUMNS = [
  {
    title: "Navigation",
    links: [
      { label: "Accueil", href: "/" },
      { label: "Nos cuisines", href: "/nos-cuisines" },
      { label: "Nos matériaux", href: "/nos-materiaux" },
      { label: "Notre savoir-faire", href: "/savoir-faire" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos", href: "/a-propos" },
      { label: "Nos réalisations", href: "/realisations" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Réserver une consultation", href: "/consultation" },
      { label: "Demander un devis", href: "/devis" },
    ],
  },
];

function SiteFooter() {
  return (
    <footer className="bg-grain bg-grain-dark border-t border-white/5 bg-ink-950 text-text-inverse">
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Logo inverse />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-text-inverse-muted">
              Des cuisines pensées pour votre espace, votre style et votre
              quotidien — conception, fabrication et pose, du premier trait au
              dernier détail.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[InstagramIcon, FacebookIcon, LinkedinIcon].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Réseau social"
                  className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-text-inverse-muted transition-colors hover:border-gold-400 hover:text-gold-400"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-gold-400">
                {col.title}
              </span>
              <ul className="mt-5 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-inverse-muted transition-colors hover:text-text-inverse"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10 bg-white/10" />

        <div className="flex flex-col gap-4 text-xs text-text-inverse-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ART Cuisine. Tous droits réservés.</span>
          <div className="flex gap-6">
            <Link href="/mentions-legales" className="hover:text-text-inverse">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-text-inverse">
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { SiteFooter };
