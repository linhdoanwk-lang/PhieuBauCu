import { NextResponse } from "next/server";
import { createSubmission, getCandidateLists } from "@/lib/ballot-db";
import { normalizeName } from "@/lib/ballot";

export const dynamic = "force-dynamic";

function cleanCandidates(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) return null;
  const candidates = value.map((candidate) => typeof candidate === "string" ? candidate.replace(/\s+/g, " ").trim().toUpperCase() : "");
  if (candidates.some((candidate) => !candidate || candidate.length > 150)) return null;
  const normalized = candidates.map(normalizeName);
  if (new Set(normalized).size !== candidates.length) return null;
  return candidates;
}

export async function GET() {
  try {
    const lists = await getCandidateLists();
    return NextResponse.json({
      presetCandidates: lists.preset,
      suggestionCandidates: lists.suggestion,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load ballot configuration", error);
    return NextResponse.json({ message: "Hệ thống dữ liệu chưa sẵn sàng." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { candidates?: unknown };
    const candidates = cleanCandidates(body.candidates);
    if (!candidates) return NextResponse.json({ message: "Danh sách ứng viên không hợp lệ." }, { status: 400 });
    const submission = await createSubmission(candidates);
    return NextResponse.json({ ok: true, ...submission }, { status: 201 });
  } catch (error) {
    console.error("Unable to save ballot", error);
    return NextResponse.json({ message: "Không thể lưu phiếu. Vui lòng thử lại." }, { status: 500 });
  }
}
