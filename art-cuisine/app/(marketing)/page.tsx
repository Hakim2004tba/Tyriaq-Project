import { HeroSection } from "@/components/marketing/hero-section";
import { IntroSection } from "@/components/marketing/intro-section";
import { PhilosophySection } from "@/components/marketing/philosophy-section";
import { ExpertiseSection } from "@/components/marketing/expertise-section";
import { ProcessSection } from "@/components/marketing/process-section";
import { MaterialsSection } from "@/components/marketing/materials-section";
import { ProjectsSection } from "@/components/marketing/projects-section";
import { CraftsmanshipSection } from "@/components/marketing/craftsmanship-section";
import { ConsultationCta } from "@/components/marketing/consultation-cta";
import { DevisCta } from "@/components/marketing/devis-cta";
import { ContactSection } from "@/components/marketing/contact-section";

export default function Home() {
  return (
    <>
      <HeroSection />
      <IntroSection />
      <PhilosophySection />
      <ExpertiseSection />
      <ProcessSection />
      <MaterialsSection />
      <ProjectsSection />
      <CraftsmanshipSection />
      <ConsultationCta />
      <DevisCta />
      <ContactSection />
    </>
  );
}
