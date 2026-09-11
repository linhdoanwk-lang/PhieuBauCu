import type { CandidateRecord } from "@/lib/ballot";

export async function readCandidateWorkbook(file: File): Promise<CandidateRecord[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!sheet) throw new Error("File Excel không có trang dữ liệu.");

  const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
  const records: CandidateRecord[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const values = new Map(Object.entries(row).map(([header, value]) => [normalized(header), value]));
    const fullName = String(values.get("HO VA TEN") ?? "").replace(/\s+/g, " ").trim();
    if (!fullName) continue;
    const key = normalized(fullName);
    if (seen.has(key)) continue;
    seen.add(key);
    const rawYear = values.get("NAM SINH");
    const parsedYear = rawYear === null || rawYear === "" ? NaN : Number(rawYear);
    records.push({
      stt: Number(values.get("STT")) || records.length + 1,
      fullName,
      familyName: String(values.get("HO") ?? "").trim(),
      givenName: String(values.get("TEN") ?? "").trim(),
      birthYear: Number.isInteger(parsedYear) ? parsedYear : null,
    });
  }
  if (rows.length && !Object.keys(rows[0]).some((header) => normalized(header) === "HO VA TEN")) {
    throw new Error('Không tìm thấy cột "HỌ VÀ TÊN".');
  }
  if (!records.length) throw new Error("File không có ứng viên hợp lệ.");
  return records;
}

function makeChart(results: { name: string; votes: number }[]) {
  const width = 900;
  const rowHeight = 42;
  const height = Math.max(360, 90 + results.length * rowHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#172135";
  context.font = "bold 24px Arial";
  context.fillText("Số phiếu theo ứng viên", 24, 38);
  const maxVotes = results[0]?.votes || 1;
  results.forEach((result, index) => {
    const y = 78 + index * rowHeight;
    context.fillStyle = "#334155";
    context.font = "14px Arial";
    context.fillText(`${index + 1}. ${result.name}`, 24, y);
    context.fillStyle = "#E6EBF2";
    context.fillRect(300, y - 15, 500, 18);
    context.fillStyle = "#2363DD";
    context.fillRect(300, y - 15, (result.votes / maxVotes) * 500, 18);
    context.fillStyle = "#172135";
    context.font = "bold 14px Arial";
    context.fillText(String(result.votes), 815, y);
  });
  return { dataUrl: canvas.toDataURL("image/png"), width, height };
}

export async function exportStatistics(
  results: { name: string; votes: number }[],
  submissionCount: number,
  namesToReview: { name: string; votes: number }[] = [],
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hệ thống phiếu bầu";
  const sheet = workbook.addWorksheet("Thống kê", { views: [{ state: "frozen", ySplit: 6 }] });
  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = "THỐNG KÊ PHIẾU BẦU";
  sheet.getCell("A2").value = "Thời điểm xuất";
  sheet.getCell("B2").value = new Date();
  sheet.getCell("B2").numFmt = "dd/mm/yyyy hh:mm";
  sheet.getCell("A3").value = "Tổng số phiếu";
  sheet.getCell("B3").value = submissionCount;
  sheet.getRow(5).values = ["STT", "HỌ VÀ TÊN", "SỐ PHIẾU", "XẾP HẠNG"];
  results.forEach((result, index) => sheet.addRow([index + 1, result.name, result.votes, index + 1]));
  sheet.addTable({ name: "BangThongKe", ref: "A5", headerRow: true, style: { theme: "TableStyleMedium2", showRowStripes: false }, columns: [{ name: "STT" }, { name: "HỌ VÀ TÊN" }, { name: "SỐ PHIẾU" }, { name: "XẾP HẠNG" }], rows: results.map((result, index) => [index + 1, result.name, result.votes, index + 1]) });
  sheet.getCell("A1").font = { name: "Arial", size: 16, bold: true, color: { argb: "FF173B65" } };
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;
  sheet.getColumn(1).width = 9;
  sheet.getColumn(2).width = 34;
  sheet.getColumn(3).width = 14;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(6).width = 3;
  sheet.getColumn(7).width = 16;
  sheet.getColumn(8).width = 16;
  sheet.getColumn(9).width = 16;
  sheet.getColumn(10).width = 16;
  sheet.eachRow((row) => { row.font = { ...row.font, name: "Arial", size: row.number === 1 ? 16 : 11 }; row.alignment = { ...row.alignment, vertical: "middle" }; });

  const chart = makeChart(results);
  if (chart) {
    const imageId = workbook.addImage({ base64: chart.dataUrl, extension: "png" });
    sheet.addImage(imageId, { tl: { col: 5.5, row: 0.5 }, ext: { width: chart.width, height: chart.height } });
  }

  const reviewSheet = workbook.addWorksheet("Tên cần kiểm tra", { views: [{ state: "frozen", ySplit: 2 }] });
  reviewSheet.mergeCells("A1:D1");
  reviewSheet.getCell("A1").value = "DANH SÁCH TÊN BỊ LỖI - CHỒNG TÊN";
  reviewSheet.getCell("A1").font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  reviewSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2363DD" } };
  reviewSheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  reviewSheet.getRow(1).height = 28;
  reviewSheet.getRow(2).values = ["STT", "TÊN LỖI (VIẾT HOA)", "TÊN ĐÚNG (VIẾT HOA)", "SỐ PHIẾU TRA THEO TÊN LỖI"];
  reviewSheet.getRow(2).height = 34;
  reviewSheet.getRow(2).eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF173B65" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDE9FF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF9FB9E8" } },
      left: { style: "thin", color: { argb: "FF9FB9E8" } },
      bottom: { style: "thin", color: { argb: "FF9FB9E8" } },
      right: { style: "thin", color: { argb: "FF9FB9E8" } },
    };
  });
  if (namesToReview.length) {
    reviewSheet.addTable({
      name: "BangTenCanKiemTra",
      ref: "A2",
      headerRow: true,
      style: { theme: "TableStyleMedium2", showRowStripes: false },
      columns: [
        { name: "STT" },
        { name: "TÊN LỖI (VIẾT HOA)" },
        { name: "TÊN ĐÚNG (VIẾT HOA)" },
        { name: "SỐ PHIẾU TRA THEO TÊN LỖI" },
      ],
      rows: namesToReview.map((result, index) => [index + 1, result.name.toUpperCase(), "", result.votes]),
    });
    namesToReview.forEach((_, index) => {
      reviewSheet.getCell(index + 3, 3).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF2CC" },
      };
    });
  } else {
    reviewSheet.mergeCells("A3:D3");
    reviewSheet.getCell("A3").value = "Không có tên ngoài danh sách cần kiểm tra.";
    reviewSheet.getCell("A3").font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };
    reviewSheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };
  }
  reviewSheet.getColumn(1).width = 8;
  reviewSheet.getColumn(2).width = 30;
  reviewSheet.getColumn(3).width = 30;
  reviewSheet.getColumn(4).width = 22;
  reviewSheet.getColumn(1).alignment = { horizontal: "center", vertical: "middle" };
  reviewSheet.getColumn(4).alignment = { horizontal: "center", vertical: "middle" };
  reviewSheet.eachRow((row) => {
    row.font = { ...row.font, name: "Arial" };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `thong-ke-phieu-bau-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
