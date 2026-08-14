import { redirect } from "next/navigation";

/**
 * Claims folded into Quality. The analytical view that used to live here is now
 * the Quality surface itself, so this route just forwards there — old links and
 * bookmarks still land in the right place.
 */
export default function ClaimsRedirect() {
  redirect("/quality");
}
