"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowCounterClockwise, CaretDown, CaretUp, ChartBar, CheckCircle, Crown, DownloadSimple, FileXls, MagnifyingGlass, SignOut, Trash, UploadSimple, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { normalizeName, presetCandidates, directorySuggestions, type CandidateRecord, type Submission } from "@/lib/ballot";
import { exportStatistics, readCandidateWorkbook } from "@/lib/excel-client";
import "./admin.css";

type ResultFilter = "all" | "new" | "duplicate" | "typo";

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const upper = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = upper;
    }
  }

  return previous[right.length];
}

function isLikelyTypo(name: string, knownNames: string[]) {
  const normalizedName = normalizeName(name);
  const wordCount = normalizedName.split(" ").length;

  return knownNames.some((knownName) => {
    if (knownName === normalizedName || knownName.split(" ").length !== wordCount) return false;
    const threshold = Math.max(normalizedName.length, knownName.length) >= 12 ? 2 : 1;
    if (Math.abs(normalizedName.length - knownName.length) > threshold) return false;
    return editDistance(normalizedName, knownName) <= threshold;
  });
}

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [hiddenCandidates, setHiddenCandidates] = useState<string[]>([]);
  const [presetCount, setPresetCount] = useState(presetCandidates.length);
  const [suggestionCount, setSuggestionCount] = useState(directorySuggestions.length);
  const [presetNames, setPresetNames] = useState(presetCandidates);
  const [suggestionNames, setSuggestionNames] = useState(directorySuggestions);
  const [nameQuery, setNameQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [showHiddenCandidates, setShowHiddenCandidates] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const response = await fetch("/api/admin/data", { cache: "no-store" });
        const data = await response.json() as {
          submissions?: Submission[];
          hiddenCandidates?: string[];
          presetCandidates?: CandidateRecord[];
          suggestionCandidates?: CandidateRecord[];
          message?: string;
        };
        if (!response.ok) throw new Error(data.message || "Không thể tải dữ liệu thống kê.");
        if (!active) return;
        const nextPreset = data.presetCandidates ?? [];
        const nextSuggestions = data.suggestionCandidates ?? [];
        setSubmissions(data.submissions ?? []);
        setHiddenCandidates(data.hiddenCandidates ?? []);
        setPresetCount(nextPreset.length);
        setSuggestionCount(nextSuggestions.length);
        setPresetNames(nextPreset.map((candidate) => candidate.fullName));
        setSuggestionNames(nextSuggestions.map((candidate) => candidate.fullName));
      } catch (error) {
        if (!active) return;
        setImportError(true);
        setImportMessage(error instanceof Error ? error.message : "Không thể tải dữ liệu thống kê.");
      }
    };
    void loadData();
    return () => { active = false; };
  }, []);

  const allResults = useMemo(() => {
    const counts = new Map<string, number>();
    submissions.forEach((submission) => submission.candidates.forEach((candidate) => counts.set(candidate, (counts.get(candidate) ?? 0) + 1)));
    return [...counts.entries()].map(([name, votes]) => ({ name, votes })).sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, "vi"));
  }, [submissions]);

  const rankedResults = allResults.filter((result) => !hiddenCandidates.includes(result.name));
  const hiddenResults = hiddenCandidates.map((name) => ({
    name,
    votes: allResults.find((result) => result.name === name)?.votes ?? 0,
  }));
  const knownNameKeys = useMemo(
    () => [...new Set([...presetNames, ...suggestionNames].map(normalizeName))],
    [presetNames, suggestionNames],
  );
  const classifiedResults = useMemo(() => {
    const knownNameSet = new Set(knownNameKeys);
    const normalizedCounts = new Map<string, number>();
    rankedResults.forEach((result) => {
      const key = normalizeName(result.name);
      normalizedCounts.set(key, (normalizedCounts.get(key) ?? 0) + 1);
    });

    return rankedResults.map((result, index) => {
      const key = normalizeName(result.name);
      const isNew = !knownNameSet.has(key);
      return {
        ...result,
        rank: index + 1,
        isNew,
        isDuplicate: (normalizedCounts.get(key) ?? 0) > 1,
        isLikelyTypo: isNew && isLikelyTypo(result.name, knownNameKeys),
      };
    });
  }, [knownNameKeys, rankedResults]);
  const filterCounts = useMemo(() => ({
    all: classifiedResults.length,
    new: classifiedResults.filter((result) => result.isNew).length,
    duplicate: classifiedResults.filter((result) => result.isDuplicate).length,
    typo: classifiedResults.filter((result) => result.isLikelyTypo).length,
  }), [classifiedResults]);
  const filteredResults = useMemo(() => {
    const query = normalizeName(nameQuery);
    return classifiedResults.filter((result) => {
      const matchesName = !query || normalizeName(result.name).includes(query);
      const matchesType = resultFilter === "all"
        || (resultFilter === "new" && result.isNew)
        || (resultFilter === "duplicate" && result.isDuplicate)
        || (resultFilter === "typo" && result.isLikelyTypo);
      return matchesName && matchesType;
    });
  }, [classifiedResults, nameQuery, resultFilter]);

  const hideFromRanking = async (name: string) => {
    try {
      const response = await fetch("/api/admin/hidden-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error();
      setHiddenCandidates((current) => [...new Set([...current, name])]);
    } catch {
      setImportError(true);
      setImportMessage("Không thể xóa ứng viên khỏi bảng xếp hạng.");
    }
  };
  const restoreRanking = async () => {
    try {
      const response = await fetch("/api/admin/hidden-candidates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error();
      setHiddenCandidates([]);
      setShowHiddenCandidates(false);
    } catch {
      setImportError(true);
      setImportMessage("Không thể khôi phục danh sách ứng viên.");
    }
  };
  const restoreCandidate = async (name: string) => {
    try {
      const response = await fetch("/api/admin/hidden-candidates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error();
      setHiddenCandidates((current) => {
        const next = current.filter((candidate) => candidate !== name);
        if (next.length === 0) setShowHiddenCandidates(false);
        return next;
      });
    } catch {
      setImportError(true);
      setImportMessage("Không thể khôi phục ứng viên.");
    }
  };

  const importCandidates = async (event: ChangeEvent<HTMLInputElement>, type: "preset" | "suggestion") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setWorking(true);
    setImportMessage("");
    setImportError(false);
    try {
      const records = await readCandidateWorkbook(file);
      const response = await fetch("/api/admin/candidates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, records }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "Không thể lưu danh sách ứng viên.");
      const names = records.map((candidate) => candidate.fullName);
      if (type === "preset") {
        setPresetCount(records.length);
        setPresetNames(names);
      } else {
        setSuggestionCount(records.length);
        setSuggestionNames(names);
      }
      setImportMessage(`Đã nhập ${records.length} người vào ${type === "preset" ? "danh sách ứng viên để chọn" : "danh sách gợi ý"}.`);
    } catch (error) {
      setImportError(true);
      setImportMessage(error instanceof Error ? error.message : "Không thể đọc file Excel.");
    } finally {
      setWorking(false);
    }
  };

  const downloadStatistics = async () => {
    setWorking(true);
    setImportMessage("");
    setImportError(false);
    try {
      const knownNames = new Set([...presetNames, ...suggestionNames].map(normalizeName));
      const namesToReview = allResults.filter((result) => !knownNames.has(normalizeName(result.name)));
      await exportStatistics(rankedResults, submissions.length, namesToReview);
      setImportMessage("Đã tạo file Excel gồm thống kê, biểu đồ và danh sách tên cần kiểm tra.");
    } catch {
      setImportError(true);
      setImportMessage("Không thể tạo file thống kê. Vui lòng thử lại.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="dashboardPage">
      <header className="adminHeader">
        <div><span>QUẢN TRỊ BẦU CỬ</span><h1>Thống kê phiếu bầu</h1></div>
        <div className="headerActions">
          <Link href="/" target="_blank">Xem phiếu bầu</Link>
          <form action="/api/admin/logout" method="post"><button type="submit"><SignOut size={18} /> Đăng xuất</button></form>
        </div>
      </header>
      <section className="dashboardContent">
        <section className="importPanel">
          <div className="importHeading">
            <div><span>QUẢN LÝ DANH SÁCH</span><h2>Nhập dữ liệu ứng viên</h2><p>File Excel cần có các cột: STT, HỌ VÀ TÊN, HỌ, TÊN, NĂM SINH.</p></div>
          </div>
          <div className="importGrid">
            <article>
              <span className="fileIcon"><FileXls size={24} weight="fill" /></span>
              <div className="importCopy"><h3>Ứng viên để chọn</h3><p>{presetCount} người đang được hiển thị trên phiếu.</p></div>
              <label className="uploadButton"><UploadSimple size={18} /> Nhập Excel<input accept=".xlsx" disabled={working} onChange={(event) => importCandidates(event, "preset")} type="file" /></label>
            </article>
            <article>
              <span className="fileIcon"><FileXls size={24} weight="fill" /></span>
              <div className="importCopy"><h3>Ứng viên gợi ý</h3><p>{suggestionCount} người dùng để gợi ý khi nhập tên.</p></div>
              <label className="uploadButton"><UploadSimple size={18} /> Nhập Excel<input accept=".xlsx" disabled={working} onChange={(event) => importCandidates(event, "suggestion")} type="file" /></label>
            </article>
          </div>
          {importMessage && <div className={`importMessage ${importError ? "importError" : ""}`} role="status">{importError ? <WarningCircle size={18} weight="fill" /> : <CheckCircle size={18} weight="fill" />} {importMessage}</div>}
        </section>

        <div className="metrics">
          <article><span className="metricIcon"><ChartBar size={22} weight="fill" /></span><div><small>Tổng số phiếu</small><strong>{submissions.length}</strong></div></article>
          <article><span className="metricIcon"><UsersThree size={22} weight="fill" /></span><div><small>Ứng viên có phiếu</small><strong>{allResults.length}</strong></div></article>
          <article><span className="metricIcon"><Crown size={22} weight="fill" /></span><div><small>Đang dẫn đầu</small><strong className="leaderName">{rankedResults[0]?.name || "Chưa có"}</strong></div></article>
        </div>
        <section className="resultsPanel">
          <div className="panelHeader">
            <div><span>KẾT QUẢ TẠM THỜI</span><h2>Xếp hạng theo số phiếu</h2><p>Xóa một hàng sẽ tự động đôn những người phía dưới lên.</p></div>
            <div className="panelActions">
              <button
                aria-expanded={showHiddenCandidates}
                className="hiddenListButton"
                disabled={hiddenCandidates.length === 0}
                onClick={() => setShowHiddenCandidates((current) => !current)}
                type="button"
              >
                {showHiddenCandidates ? <CaretUp size={18} /> : <CaretDown size={18} />}
                {hiddenCandidates.length > 0 ? `Xem danh sách đã xóa (${hiddenCandidates.length})` : "Chưa có người đã xóa"}
              </button>
              <button className="exportButton" disabled={working || rankedResults.length === 0} onClick={downloadStatistics} type="button"><DownloadSimple size={18} /> Xuất Excel và biểu đồ</button>
            </div>
          </div>
          {showHiddenCandidates && hiddenResults.length > 0 && (
            <section className="hiddenCandidatesPanel" aria-label="Danh sách người đã xóa">
              <div className="hiddenCandidatesHeader">
                <div><h3>Danh sách người đã xóa</h3><p>Khôi phục để đưa người đó trở lại đúng vị trí trong bảng xếp hạng.</p></div>
                <button className="restoreAllButton" onClick={restoreRanking} type="button"><ArrowCounterClockwise size={17} /> Khôi phục tất cả</button>
              </div>
              <div className="hiddenCandidatesList">
                {hiddenResults.map((result) => (
                  <div className="hiddenCandidateRow" key={result.name}>
                    <div><strong>{result.name}</strong><span>{result.votes} phiếu</span></div>
                    <button onClick={() => restoreCandidate(result.name)} type="button"><ArrowCounterClockwise size={16} /> Khôi phục</button>
                  </div>
                ))}
              </div>
            </section>
          )}
          {rankedResults.length > 0 && (
            <div className="resultFilterArea">
              <label className="nameSearch">
                <MagnifyingGlass aria-hidden="true" size={19} />
                <input
                  aria-label="Lọc theo tên ứng viên"
                  onChange={(event) => setNameQuery(event.target.value)}
                  placeholder="Nhập tên ứng viên cần tìm..."
                  type="search"
                  value={nameQuery}
                />
              </label>
              <div aria-label="Lọc theo loại tên" className="filterButtons" role="group">
                {([
                  ["all", "Tất cả"],
                  ["new", "Tên mới"],
                ] as const).map(([value, label]) => (
                  <button
                    aria-pressed={resultFilter === value}
                    className="filterButton"
                    key={value}
                    onClick={() => setResultFilter(value)}
                    type="button"
                  >
                    {label} <span>{filterCounts[value]}</span>
                  </button>
                ))}
              </div>
              {resultFilter === "typo" && <p className="filterHint">Đây là gợi ý tự động dựa trên tên gần giống trong danh sách đã nhập. Admin cần kiểm tra lại trước khi sửa tên.</p>}
            </div>
          )}
          {rankedResults.length === 0 ? (
            <div className="emptyState"><ChartBar size={42} /><h3>Chưa có dữ liệu</h3><p>Các phiếu gửi trên trình duyệt này sẽ xuất hiện ở đây.</p></div>
          ) : filteredResults.length === 0 ? (
            <div className="emptyState"><MagnifyingGlass size={42} /><h3>Không tìm thấy ứng viên</h3><p>Thử đổi tên tìm kiếm hoặc chọn bộ lọc khác.</p></div>
          ) : (
            <div className="rankingList">
              {filteredResults.map((result) => {
                const maxVotes = rankedResults[0]?.votes || 1;
                return <div className="rankingRow" key={result.name}><span className={`rank ${result.rank <= 3 ? "topRank" : ""}`}>{result.rank}</span><div className="resultMain"><div className="resultName"><div className="candidateIdentity"><strong>{result.name}</strong><div className="nameBadges">{result.isNew && <span className="nameBadge newNameBadge">Tên mới</span>}</div></div><span className="voteCount">{result.votes} phiếu</span></div><div className="voteBar"><span style={{ width: `${(result.votes / maxVotes) * 100}%` }} /></div></div><button className="hideButton" onClick={() => hideFromRanking(result.name)} title="Ẩn khỏi bảng xếp hạng" type="button"><Trash size={18} /><span>Xóa</span></button></div>;
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
