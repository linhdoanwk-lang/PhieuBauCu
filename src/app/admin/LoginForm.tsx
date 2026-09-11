"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKey, SignIn } from "@phosphor-icons/react";
import "./admin.css";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        setError(result.message || "Không thể đăng nhập.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="loginPage">
      <div className="loginAccent" />
      <section className="loginCard">
        <span className="lockIcon"><LockKey size={28} weight="fill" /></span>
        <div className="loginEyebrow">KHU VỰC QUẢN TRỊ</div>
        <h1>Đăng nhập thống kê</h1>
        <p>Chỉ quản trị viên được phép xem kết quả và điều chỉnh bảng xếp hạng.</p>
        <form onSubmit={submit}>
          <label>Tên đăng nhập<input autoComplete="username" autoFocus onChange={(event) => setUsername(event.target.value)} required value={username} /></label>
          <label>Mật khẩu<input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          {error && <div className="loginError" role="alert">{error}</div>}
          <button disabled={loading} type="submit"><SignIn size={20} weight="bold" />{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
        </form>
        <Link className="backLink" href="/"><ArrowLeft size={17} /> Quay lại phiếu bầu</Link>
      </section>
    </main>
  );
}
