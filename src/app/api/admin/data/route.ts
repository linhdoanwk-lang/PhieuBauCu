import { NextResponse } from "next/server";
import { adminIsAuthenticated } from "@/lib/admin-auth";
import { getAdminData } from "@/lib/ballot-db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await adminIsAuthenticated())) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
  try {
    return NextResponse.json(await getAdminData(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load admin data", error);
    return NextResponse.json({ message: "Không thể tải dữ liệu thống kê." }, { status: 503 });
  }
}
