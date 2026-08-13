import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PERSONA_COOKIE } from "@/lib/persona";
import { DEFAULT_PERSONA, PERSONA_HOME, isPersona } from "@/types/persona";

// The proxy already redirects "/" to the active persona's home. This is the
// fallback for any request that reaches the route directly (e.g. a build-time
// prerender), so root is never a blank page.
export default async function RootPage() {
  const store = await cookies();
  const value = store.get(PERSONA_COOKIE)?.value;
  redirect(PERSONA_HOME[isPersona(value) ? value : DEFAULT_PERSONA]);
}
