import type { Metadata } from "next";
import Link from "next/link";
import { isContactReason } from "@/config/contact";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, SITE } from "@/lib/site";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = pageMetadata({
  title: "Contact us",
  description: `Ask ${SITE.name} to remove or correct something, see or delete your data, or just get in touch.`,
  path: "/contact",
});

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const { about, url } = await searchParams;
  const reason = typeof about === "string" && isContactReason(about) ? about : undefined;
  // Only our own pages are prefilled, so a crafted link can't plant someone else's URL in the form.
  const ownUrl = typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : undefined;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Contact us</h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        Publishers can ask us to take down headlines or fix a mistake here; see{" "}
        <Link href="/publishers" className="underline hover:text-foreground">
          For publishers
        </Link>{" "}
        for how our feed reader works and the quickest ways to opt out. Readers can ask to see or delete their data.
        {SITE.contactEmail && (
          <>
            {" "}
            You can also email{" "}
            <a href={`mailto:${SITE.contactEmail}`} className="underline hover:text-foreground">
              {SITE.contactEmail}
            </a>
            .
          </>
        )}
      </p>
      <ContactForm reason={reason} url={ownUrl && absoluteUrl(ownUrl)} />
    </div>
  );
}
