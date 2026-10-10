import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function toWhatsAppDigits(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function WhatsAppShareLink({ phone, message }: { phone: string | null; message: string }) {
  if (!phone) return null;

  const url = `https://wa.me/${toWhatsAppDigits(phone)}?text=${encodeURIComponent(message)}`;

  return (
    <Button type="button" variant="outline" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-3.5 w-3.5" /> Envoyer via WhatsApp
      </a>
    </Button>
  );
}

export { WhatsAppShareLink };
