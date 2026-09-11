import { NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminSession, credentialsAreValid } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const { username, password } = (await request.json()) as { username?: string; password?: string };
    if (!credentialsAreValid(username?.trim() || "", password || "")) {
      return NextResponse.json({ message: "Tên đăng nhập hoặc mật khẩu không đúng." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_COOKIE,
      value: createAdminSession(),
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.ADMIN_COOKIE_SECURE === "true",
      maxAge: 12 * 60 * 60,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ message: "Không thể đăng nhập. Vui lòng thử lại." }, { status: 400 });
  }
}
