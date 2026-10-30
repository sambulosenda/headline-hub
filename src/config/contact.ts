/** What a message through /contact can be about. Kept apart from src/lib/contact.ts so the form can import it. */
export const CONTACT_REASONS = [
  { value: "takedown", label: "Remove my publication's headlines or a story" },
  { value: "correction", label: "Report a wrong grouping, headline or link" },
  { value: "privacy", label: "My data (see or delete what you hold)" },
  { value: "feed", label: "A problem with how you read our feed" },
  { value: "other", label: "Something else" },
] as const;

export type ContactReason = (typeof CONTACT_REASONS)[number]["value"];

export function isContactReason(value: string): value is ContactReason {
  return CONTACT_REASONS.some((r) => r.value === value);
}
