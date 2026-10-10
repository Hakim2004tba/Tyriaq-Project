import { MapPin, Phone, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WhatsAppShareLink } from "@/components/dashboard/devis/whatsapp-share-link";
import { mapsUrlForAddress } from "@/lib/data/montage";

function ClientContactCard({
  clientName,
  address,
  phone,
  projectRef,
  stage,
}: {
  clientName: string;
  address: string;
  phone: string | null;
  projectRef: string;
  stage?: string;
}) {
  const message = stage
    ? `Bonjour ${clientName}, votre installation (projet ${projectRef}) vient de passer à l'étape « ${stage} ». N'hésitez pas à nous contacter pour toute question.`
    : `Bonjour ${clientName}, notre équipe se prépare pour l'installation de votre cuisine (projet ${projectRef}). N'hésitez pas à nous contacter pour toute question.`;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2.5">
        <MapPin className="h-4 w-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">Adresse du chantier</h3>
      </div>
      <p className="text-sm text-text-secondary">{address}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" asChild>
          <a href={mapsUrlForAddress(address)} target="_blank" rel="noopener noreferrer">
            <Navigation className="h-3.5 w-3.5" /> Ouvrir dans Maps
          </a>
        </Button>
        {phone && (
          <Button type="button" variant="outline" asChild>
            <a href={`tel:${phone.replace(/\s/g, "")}`}>
              <Phone className="h-3.5 w-3.5" /> Appeler {clientName}
            </a>
          </Button>
        )}
        <WhatsAppShareLink phone={phone} message={message} />
      </div>
    </Card>
  );
}

export { ClientContactCard };
