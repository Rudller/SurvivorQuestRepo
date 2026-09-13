/**
 * One source for the contact details, because they are rendered in three
 * places that must agree: the contact card, the footer, and the JSON-LD
 * `Organization`. Structured data that disagrees with the visible page is
 * worse than no structured data at all, and the e-mail used to be hardcoded in
 * the layout while the page read it from the environment.
 */

const DEFAULT_CONTACT_EMAIL = "kontakt@survivorquest.pl";
const DEFAULT_CONTACT_PHONE = "+48 730 622 029";

export function getContactEmail() {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL;
}

export function getContactPhone() {
  return process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || DEFAULT_CONTACT_PHONE;
}

/** `tel:` hrefs and schema.org both want the number without spacing. */
export function toDialablePhone(phone: string) {
  return phone.replace(/\s+/g, "");
}

export function getQuoteHrefBase() {
  return process.env.NEXT_PUBLIC_QUOTE_URL?.trim() || `mailto:${getContactEmail()}`;
}
