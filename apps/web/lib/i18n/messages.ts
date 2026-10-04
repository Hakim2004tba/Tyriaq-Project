import { DEFAULT_LOCALE, type Locale } from "./config";
import { en, type MessageKey } from "./en";
import { ar } from "./ar";

/**
 * The dictionary for one language, and the lookup over it.
 *
 * English is the base and every other language is a partial overlay, so
 * a missing key falls back to English rather than rendering `nav.home`
 * into a sidebar. Half-translated is a real state — it is what every
 * release between "we support Arabic" and "every string is Arabic"
 * looks like — and it should degrade to a readable product.
 */
const DICTIONARIES: Record<Locale, Partial<Record<MessageKey, string>>> = { en, ar };

export type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

export function translator(locale: Locale): Translator {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];

  return (key, values) => {
    const template = dictionary[key] ?? en[key] ?? key;
    if (!values) return template;

    // `{name}` rather than an interpolation library: this is the whole
    // of what the product needs, and ICU syntax would be a dependency
    // for a feature nothing uses.
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match
    );
  };
}

export type { MessageKey };

/**
 * Keys for the values that come out of the database as identifiers.
 *
 * A status is `in_progress` in a row and "In progress" on screen — the
 * mapping belongs here rather than at twenty call sites, each of which
 * would otherwise have to remember the dictionary's naming scheme.
 */
export function statusKey(status: string): MessageKey {
  return `status.${status}` as MessageKey;
}

export function priorityKey(priority: string): MessageKey {
  return `priority.${priority}` as MessageKey;
}

export function permissionKey(level: string): MessageKey {
  return `permission.${level}` as MessageKey;
}
