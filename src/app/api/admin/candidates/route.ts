import { NextResponse } from "next/server";
import { adminIsAuthenticated } from "@/lib/admin-auth";
import { replaceCandidateList } from "@/lib/ballot-db";
import { normalizeName, type CandidateRecord } from "@/lib/ballot";

function cleanRecords(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10000) return null;
  const records = value.filter((record): record is CandidateRecord => (
    typeof record === "object" && record !== null && typeof (record as CandidateRecord).fullName === "string"
  )).map((record, index) => ({
    stt: Number.isFinite(record.stt) ? Number(record.stt) : index + 1,
    fullName: record.fullName.replace(/\s+/g, " ").trim().toUpperCase(),
    familyName: typeof record.familyName === "string" ? record.familyName.trim() : "",
    givenName: typeof record.givenName === "string" ? record.givenName.trim() : "",
    birthYear: Number.isFinite(record.birthYear) ? Number(record.birthYear) : null,
  }));
  if (records.length !== value.length || records.some((record) => !record.fullName || record.fullName.length > 150)) return null;
  if (new Set(records.map((record) => normalizeName(record.fullName))).size !== records.length) return null;
  return records;
}

export async function PUT(request: Request) {
  if (!(await adminIsAuthenticated())) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
  try {
    const body = await request.json() as { type?: unknown; records?: unknown };
    if (body.type !== "preset" && body.type !== "suggestion") return NextResponse.json({ message: "Loại danh sách không hợp lệ." }, { status: 400 });
    const records = cleanRecords(body.records);
    if (!records) return NextResponse.json({ message: "Dữ liệu ứng viên không hợp lệ hoặc bị trùng tên." }, { status: 400 });
    await replaceCandidateList(body.type, records);
    return NextResponse.json({ ok: true, count: records.length });
  } catch (error) {
    console.error("Unable to replace candidate list", error);
    return NextResponse.json({ message: "Không thể lưu danh sách ứng viên." }, { status: 500 });
  }
}
