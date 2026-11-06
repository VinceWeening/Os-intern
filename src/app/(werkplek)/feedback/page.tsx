import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
export default async function FeedbackPage() {
  await requireStaff();
  redirect("/beveiliging#feedback");
}
