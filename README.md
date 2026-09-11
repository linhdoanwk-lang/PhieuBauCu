# Phiếu Bầu Cử

Ứng dụng Next.js để thu thập phiếu bầu, quản lý danh sách ứng viên và thống kê kết quả. Dữ liệu được lưu trong PostgreSQL dùng chung thay vì trình duyệt của từng thiết bị.

## Công nghệ

- Next.js 16
- Vercel Functions
- Neon PostgreSQL qua `@neondatabase/serverless`
- ExcelJS/XLSX để import và xuất báo cáo

## Biến môi trường

Sao chép `.env.example` thành `.env.local` và cấu hình:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=mat-khau-admin
ADMIN_SESSION_SECRET=chuoi-bi-mat-dai-va-ngau-nhien
ADMIN_COOKIE_SECURE=false
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

Khi chạy trên Vercel, đặt `ADMIN_COOKIE_SECURE=true`. Không commit `.env.local` lên GitHub.

## Chạy trên máy

```bash
npm install
npm run dev
```

- Phiếu bầu: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

Database và các bảng sẽ được khởi tạo ở lần gọi API đầu tiên. Hai danh sách ứng viên mặc định được thêm khi database chưa có dữ liệu.

## Deploy bằng Vercel Free

1. Import repository GitHub `linhdoanwk-lang/PhieuBauCu` vào Vercel.
2. Trong Vercel Marketplace, cài Neon và kết nối database với project.
3. Thêm bốn biến môi trường Admin như mẫu phía trên; đặt `ADMIN_COOKIE_SECURE=true`.
4. Redeploy project.

Sau khi deploy, phiếu gửi từ mọi thiết bị sẽ cùng xuất hiện trong trang Admin.
