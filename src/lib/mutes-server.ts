import { cookies } from "next/headers";
import { getCurrentUser, loadPreferences, savePreferences } from "./auth";
import { MUTES_COOKIE, parseMutes, serializeMutes, type Mutes } from "./mutes";

const ONE_YEAR = 60 * 60 * 24 * 365;

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
  (await cookies()).set(MUTES_COOKIE, serializeMutes(mutes), {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
