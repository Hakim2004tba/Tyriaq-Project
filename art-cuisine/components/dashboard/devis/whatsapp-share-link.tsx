import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * wa.me needs the full international number with no leading zero — but
 * phones are captured/entered every which way (local "0555…", "+213 5 55…",
 * spaced, etc.). Algerian local mobile numbers are 10 digits starting with
 * 0; swap that leading 0 for the country code. Anything already carrying a
 * country code (doesn't start with a bare 0) is left as-is.
 */
function toWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return `213${digits.slice(1)}`;
  }
  return digits;
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
