import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phiếu bầu Ban Chấp hành",
  description: "Phiếu đề cử và thống kê kết quả ngay trên trình duyệt.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="vi"><body suppressHydrationWarning>{children}</body></html>;
}
