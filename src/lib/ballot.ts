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
export const STORAGE_KEY = "ballot-submissions-v1";
export const HIDDEN_KEY = "ballot-hidden-candidates-v1";
export const PRESET_CANDIDATES_KEY = "ballot-preset-candidates-v1";
export const SUGGESTION_CANDIDATES_KEY = "ballot-suggestion-candidates-v1";

export function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/\s+/g, " ").trim().toUpperCase();
}
