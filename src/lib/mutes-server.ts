import { cookies } from "next/headers";
import { MUTES_COOKIE, parseMutes, type Mutes } from "./mutes";

export async function getMutes(): Promise<Mutes> {
  return parseMutes((await cookies()).get(MUTES_COOKIE)?.value);
}
