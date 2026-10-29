import { cookies } from "next/headers";
import { getCurrentUser, loadPreferences, savePreferences } from "./auth";
import { MUTES_COOKIE, parseMutes, serializeMutes, type Mutes } from "./mutes";

const ONE_YEAR = 60 * 60 * 24 * 365;
/** Browsers drop cookies over 4KB; leave room for the name and attributes. */
const MAX_COOKIE_BYTES = 3800;

/** The reader's mutes: from their account when signed in, otherwise this browser's cookie. */
export async function getMutes(): Promise<Mutes> {
  const user = await getCurrentUser();
  if (user) return loadPreferences(user.id);
  return parseMutes((await cookies()).get(MUTES_COOKIE)?.value);
}

/** Only callable from a server action or route handler, since it may set a cookie. */
export async function saveMutes(mutes: Mutes) {
  const user = await getCurrentUser();
  if (user) return savePreferences(user.id, mutes);
  const value = serializeMutes(mutes);
  // Non-Latin keywords percent-encode to several bytes a character, so check the encoded size.
  if (encodeURIComponent(value).length > MAX_COOKIE_BYTES) return;
  (await cookies()).set(MUTES_COOKIE, value, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
