import type { Metadata } from "next";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        No password. We email you a link, and your saved stories and muted topics, sources and keywords follow you to every device.
      </p>
      <SignInForm />
    </div>
  );
}
