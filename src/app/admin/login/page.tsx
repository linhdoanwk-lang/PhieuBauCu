import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-auth";
import LoginForm from "../LoginForm";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  if (verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value)) redirect("/admin");
  return <LoginForm />;
}
