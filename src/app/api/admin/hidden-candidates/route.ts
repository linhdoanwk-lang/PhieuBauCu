import { NextResponse } from "next/server";
import { adminIsAuthenticated } from "@/lib/admin-auth";
import { hideCandidate, restoreCandidateFromRanking } from "@/lib/ballot-db";

export async function POST(request: Request) {
  if (!(await adminIsAuthenticated())) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
  const { name } = await request.json() as { name?: unknown };
  if (typeof name !== "string" || !name.trim()) return NextResponse.json({ message: "Tên không hợp lệ." }, { status: 400 });
  await hideCandidate(name.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await adminIsAuthenticated())) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
  const { name } = await request.json() as { name?: unknown };
  if (name !== undefined && (typeof name !== "string" || !name.trim())) return NextResponse.json({ message: "Tên không hợp lệ." }, { status: 400 });
  await restoreCandidateFromRanking(typeof name === "string" ? name.trim() : undefined);
  return NextResponse.json({ ok: true });
}
