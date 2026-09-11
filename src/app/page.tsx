"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle, LockKey, MagnifyingGlass, Plus, Trash, UsersThree, X } from "@phosphor-icons/react";
import { directorySuggestions, normalizeName, PRESET_CANDIDATES_KEY, presetCandidates, readJson, STORAGE_KEY, SUGGESTION_CANDIDATES_KEY, type CandidateRecord, type Submission } from "@/lib/ballot";
import "./form.css";

export default function Home() {
  const [selected, setSelected] = useState<string[]>([]);
  const [customCandidates, setCustomCandidates] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [availableCandidates, setAvailableCandidates] = useState(presetCandidates);
  const [suggestionPool, setSuggestionPool] = useState(directorySuggestions);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSubmissions(readJson<Submission[]>(STORAGE_KEY, []));
    const importedPreset = readJson<CandidateRecord[]>(PRESET_CANDIDATES_KEY, []);
    const importedSuggestions = readJson<CandidateRecord[]>(SUGGESTION_CANDIDATES_KEY, []);
    if (importedPreset.length) setAvailableCandidates(importedPreset.map((item) => item.fullName.toUpperCase()));
    if (importedSuggestions.length) setSuggestionPool(importedSuggestions.map((item) => item.fullName.toUpperCase()));
  }, []);
  useEffect(() => { if (isAdding) inputRef.current?.focus(); }, [isAdding]);

  const allVisibleNames = useMemo(() => [...availableCandidates, ...customCandidates], [availableCandidates, customCandidates]);
  const suggestions = useMemo(() => {
    const term = normalizeName(query);
    const existing = new Set(allVisibleNames.map(normalizeName));
    return suggestionPool.filter((name) => (!term || normalizeName(name).includes(term)) && !existing.has(normalizeName(name))).slice(0, 5);
  }, [query, allVisibleNames, suggestionPool]);

  const toggleCandidate = (name: string) => {
    setSelected((current) => current.includes(name) ? current.filter((candidate) => candidate !== name) : [...current, name]);
    setMessage("");
  };

  const addCustomCandidate = (rawName: string) => {
    const name = rawName.replace(/\s+/g, " ").trim().toUpperCase();
    if (!name) return setMessage("Vui lòng nhập họ và tên ứng viên.");
    if (allVisibleNames.some((candidate) => normalizeName(candidate) === normalizeName(name))) return setMessage("Tên này đã có trong danh sách.");
    setCustomCandidates((current) => [...current, name]);
    setSelected((current) => [...current, name]);
    setQuery("");
    setMessage("");
    inputRef.current?.focus();
  };

  const removeCustomCandidate = (name: string) => {
    setCustomCandidates((current) => current.filter((item) => item !== name));
    setSelected((current) => current.filter((item) => item !== name));
  };

  const openReview = () => {
    if (selected.length === 0) return setMessage("Bạn cần chọn ít nhất một ứng viên trước khi gửi.");
    setMessage("");
    setReviewing(true);
  };

  const confirmSubmission = () => {
    const submissionId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const next = [...submissions, { id: submissionId, submittedAt: new Date().toISOString(), candidates: selected }];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSubmissions(next);
    setReviewing(false);
    setSubmitted(true);
  };

  const startAnother = () => {
    setSelected([]); setCustomCandidates([]); setQuery(""); setSubmitted(false); setIsAdding(false);
  };

  return (
    <main className="pageShell">
      
      <section className="appFrame">
        <header className="header">
          <div className="eyebrow">BẦU CỬ BAN CHẤP HÀNH</div>
          <h1>Phiếu đề cử nhiệm kỳ 2025–2027</h1>
          <p>Chọn các ứng viên bạn tín nhiệm hoặc bổ sung người chưa có trong danh sách.</p>
        </header>

        {submitted ? (
          <section className="successCard" aria-live="polite">
            <span className="successIcon"><Check size={34} weight="bold" /></span>
            <h2>Đã ghi nhận phiếu bầu</h2>
            <p>Bạn đã chọn {selected.length} ứng viên. Phiếu đang được lưu trên trình duyệt này.</p>
            <div className="successActions"><button className="primaryButton" onClick={startAnother} type="button">Tạo phiếu mới</button></div>
          </section>
        ) : (
          <div className="ballotLayout">
            <section className="formCard">
              <div className="instructions">
                <h2>Cách bỏ phiếu</h2>
                <ol>
                  <li>Tích các ứng viên có sẵn trong danh sách</li>
                  <li>Nếu chưa có tên, nhấn <strong>Thêm ứng viên</strong> rồi tìm hoặc nhập họ tên.
                    <ol>PHẢI VIẾT HOA TOÀN BỘ TÊN ỨNG VIÊN</ol>
                    <ol>Mỗi ứng viên chỉ điền một lần</ol>
                  </li>
                  <li>Kiểm tra chính xác trước khi SUBMIT.</li>
                  
                </ol>
              </div>
              <div className="sectionHeading">
                <div><h2>Danh sách ứng viên</h2><p>{availableCandidates.length} người đã được soạn sẵn</p></div>
                <span className="countPill">{selected.length} đã chọn</span>
              </div>
              <div className="candidateList">
                {availableCandidates.map((candidate) => (
                  <label className="candidateRow" key={candidate}>
                    <input checked={selected.includes(candidate)} onChange={() => toggleCandidate(candidate)} type="checkbox" />
                    <span className="fakeCheckbox" aria-hidden="true"><Check size={15} weight="bold" /></span><span>{candidate}</span>
                  </label>
                ))}
              </div>
              {customCandidates.length > 0 && (
                <div className="addedSection">
                  <div className="addedTitle">Ứng viên bổ sung</div>
                  {customCandidates.map((candidate) => (
                    <div className="addedRow" key={candidate}>
                      <label><input checked={selected.includes(candidate)} onChange={() => toggleCandidate(candidate)} type="checkbox" /><span className="fakeCheckbox" aria-hidden="true"><Check size={15} weight="bold" /></span><span>{candidate}</span></label>
                      <button aria-label={`Xóa ${candidate}`} onClick={() => removeCustomCandidate(candidate)} title="Xóa ứng viên bổ sung" type="button"><Trash size={19} /></button>
                    </div>
                  ))}
                </div>
              )}
              {!isAdding ? (
                <button className="addButton" onClick={() => setIsAdding(true)} type="button"><Plus size={20} weight="bold" /> Thêm ứng viên ngoài danh sách</button>
              ) : (
                <div className="addPanel">
                  <div className="addPanelTop"><div><h3>Thêm ứng viên</h3><p>Bạn có thể thêm nhiều người, mỗi người một lần.</p></div><button aria-label="Đóng" onClick={() => { setIsAdding(false); setQuery(""); setMessage(""); }} type="button"><X size={21} /></button></div>
                  <form onSubmit={(event: FormEvent) => { event.preventDefault(); addCustomCandidate(query); }}>
                    <div className="searchField"><MagnifyingGlass size={20} /><input aria-label="Họ và tên ứng viên" onChange={(event) => { setQuery(event.target.value); setMessage(""); }} placeholder="Nhập họ và tên..." ref={inputRef} value={query} /><button disabled={!query.trim()} type="submit">Thêm</button></div>
                  </form>
                  {suggestions.length > 0 && <div className="suggestions"><span>Gợi ý</span>{suggestions.map((candidate) => <button key={candidate} onClick={() => addCustomCandidate(candidate)} type="button"><span className="avatar">{candidate.charAt(0)}</span><span>{candidate}</span><Plus size={18} /></button>)}</div>}
                </div>
              )}
              {message && <p className="errorMessage" role="alert">{message}</p>}
            </section>
            <aside className="summaryCard">
              <div className="summaryIcon"><UsersThree size={24} weight="fill" /></div>
              <div><span>Đã lựa chọn</span><strong>{selected.length}</strong><small>ứng viên</small></div>
              <p>Bạn vẫn có thể thay đổi lựa chọn trước khi gửi phiếu.</p>
              <button className="primaryButton" disabled={selected.length === 0} onClick={openReview} type="button">Kiểm tra và gửi</button>
            </aside>
          </div>
        )}
      </section>
      {reviewing && (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => setReviewing(false)}>
          <section aria-labelledby="review-title" aria-modal="true" className="modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <button className="modalClose" aria-label="Đóng" onClick={() => setReviewing(false)} type="button"><X size={22} /></button>
            <h2 id="review-title">Kiểm tra trước khi gửi</h2>
            <p>Bạn đã chọn {selected.length} ứng viên. Sau khi xác nhận, phiếu sẽ được thêm vào thống kê trên máy này.</p>
            <div className="reviewList">{selected.map((candidate, index) => <div key={candidate}><span>{index + 1}</span>{candidate}</div>)}</div>
            <div className="modalActions"><button className="secondaryButton" onClick={() => setReviewing(false)} type="button">Quay lại chỉnh sửa</button><button className="primaryButton" onClick={confirmSubmission} type="button">Xác nhận gửi phiếu</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
