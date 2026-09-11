export const presetCandidates = [
  "NGUYỄN VĂN AN", "TRẦN THỊ BÌNH", "LÊ QUANG CƯỜNG", "PHẠM MINH ĐỨC",
  "HOÀNG THU GIANG", "VŨ NGỌC HẢI", "ĐỖ THỊ HẠNH", "BÙI GIA HUY",
  "ĐẶNG TUẤN KIỆT", "NGÔ KHÁNH LINH", "DƯƠNG HOÀI NAM", "PHAN THỊ OANH",
  "LÝ MINH QUÂN", "TRỊNH THẢO VY", "MAI QUỐC VIỆT",
];

export const directorySuggestions = [
  "NGUYỄN HOÀNG BẢO", "TRẦN QUỲNH CHI", "LÊ THÀNH CÔNG", "PHẠM NGỌC DIỆP",
  "HOÀNG ANH DŨNG", "VŨ THU HÀ", "ĐỖ QUANG KHẢI", "BÙI DIỆU LINH",
  "ĐẶNG MINH PHÚC", "NGÔ THẢO TRANG",
];

export type Submission = { id: string; submittedAt: string; candidates: string[] };
export type CandidateRecord = { stt: number; fullName: string; familyName: string; givenName: string; birthYear: number | null };

export function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/\s+/g, " ").trim().toUpperCase();
}
