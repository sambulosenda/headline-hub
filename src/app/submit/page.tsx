import type { Metadata } from "next";
import { SubmitForm } from "./SubmitForm";

export const metadata: Metadata = { title: "Submit your feed" };

export default function SubmitPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Submit your feed</h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        Publish original news? Send us your RSS or Atom feed. We show your headlines and link straight to your site, never
        republishing your articles. We check the feed automatically, then a person reviews it.
      </p>
      <SubmitForm />
    </div>
  );
}
