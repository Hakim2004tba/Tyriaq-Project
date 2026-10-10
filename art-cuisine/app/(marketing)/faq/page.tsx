import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Kicker } from "@/components/ui/section-heading";
import { FAQ_GROUPS } from "@/lib/data/faq";

export const metadata: Metadata = {
  title: "FAQ — ART Cuisine",
  description: "Les réponses aux questions les plus fréquentes sur nos cuisines sur mesure.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        kicker="Questions fréquentes"
        title="Tout savoir avant de se lancer"
        description="Devis, délais, pose, garantie — retrouvez les réponses aux questions les plus posées par nos clients. Une autre question ? Notre équipe reste à votre écoute."
        breadcrumb={[{ label: "FAQ" }]}
      />

      <section className="mx-auto max-w-4xl px-6 py-20 lg:px-10 lg:py-24">
        <div className="flex flex-col gap-14">
          {FAQ_GROUPS.map((group) => (
            <div key={group.title}>
              <Kicker>{group.title}</Kicker>
              <Accordion type="single" collapsible className="mt-5">
                {group.items.map((item) => (
                  <AccordionItem key={item.question} value={item.question}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border-subtle bg-surface-sunken">
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-5 px-6 py-16 lg:px-10">
          <h2 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
            Vous ne trouvez pas votre réponse ?
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-text-secondary">
            Notre équipe vous répond personnellement, par téléphone ou par
            e-mail, sous 24 à 48h.
          </p>
          <Button asChild>
            <Link href="/contact">Contacter l&rsquo;équipe →</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
