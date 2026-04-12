# TramCan E-Tax

Ứng dụng hỗ trợ **hộ kinh doanh (HKD)** theo dõi giao dịch, chứng từ, thuế ước tính và cảnh báo tuân thủ — frontend React + backend NestJS + PostgreSQL (Prisma).

## Mục tiêu

- Sổ **thu / chi**, phân loại dịch vụ / bán hàng, gắn tài khoản ngân hàng.
- **Chứng từ** (hợp đồng, hóa đơn, phiếu) liên kết giao dịch; cảnh báo giao dịch **> 20.000.000 ₫** thiếu hợp đồng.
- **Dashboard** tổng quan, biểu đồ theo tháng, thuế GTGT/TNCN (tỷ lệ cấu hình).
- **Compliance**: điểm rủi ro, đối soát demo với tổng vào TK (mock).
- **In báo cáo giao dịch** (lọc thu/chi, ngày/tuần/tháng, giá trị lớn).
- **Đăng nhập demo**: admin xem Dashboard; user thường không vào Dashboard.

> Giai đoạn hiện tại: dữ liệu nghiệp vụ chủ yếu **lưu trên frontend (context + localStorage)**; API Nest + Prisma sẵn sàng để nối CRUD và auth JWT.

## Công nghệ

| Thành phần | Stack |
|------------|--------|
| Web | React 19, Vite, TypeScript, Ant Design, Recharts, React Router |
| API | NestJS 11, Prisma 5, PostgreSQL |
| DB | Schema Prisma trong `api/prisma/schema.sql`; tham chiếu SQL tại `database/schema.sql` |

## Cấu trúc thư mục

```
TramCan_Etax/
├── api/                 # NestJS + Prisma
│   ├── prisma/          # schema.prisma, migrations (khi chạy migrate)
│   └── src/             # AppModule, PrismaModule, health
├── web/                 # Vite React SPA
│   └── src/
│       ├── context/     # AppData (mock), Auth
│       ├── pages/       # Dashboard, Transactions, Documents, ...
│       └── lib/         # tax, compliance, in báo cáo, format
├── database/            # schema.sql tham chiếu / review SQL
├── package.json         # script gọi dev/build từng app
└── README.md
```

## Yêu cầu môi trường

- **Node.js** LTS (khuyến nghị 20+)
- **PostgreSQL** (khi chạy API + migrate thật)

## Cài đặt & chạy nhanh

### 1. Frontend (bắt buộc để xem UI đầy đủ)

```bash
cd web
npm install
npm run dev
```


### 2. Backend API

```bash
cd api
cp .env.example .env
# Chỉnh DATABASE_URL trỏ tới PostgreSQL

npm install
npx prisma migrate dev    # hoặc: npm run db:push
npm run start:dev
```

API mặc định: [http://localhost:3000](http://localhost:3000), prefix **`/api`** (ví dụ health: `GET /api/health`).

### 3. Từ thư mục gốc (tiện gọi song song)

```bash
npm run dev:web
npm run dev:api
```

## Biến môi trường

| File | Mô tả |
|------|--------|
| `api/.env.example` → `.env` | `DATABASE_URL`, `WEB_ORIGIN` (CORS) |
| `web/.env.example` | `VITE_API_URL` (tham chiếu; dev dùng proxy) |

## Script hữu ích

| Lệnh | Mô tả |
|------|--------|
| `npm run dev:web` | Dev Vite |
| `npm run dev:api` | Dev Nest watch |
| `npm run build:web` | Build SPA → `web/dist` |
| `npm run build:api` | Build API → `api/dist` |
| `cd api && npm run db:migrate` | Prisma migrate |
| `cd api && npm run db:push` | Đẩy schema (dev) |
| `cd api && npm test` | Unit test Jest |

## In báo cáo giao dịch

Trang **Giao dịch** → **In danh sách**: chọn thu/chi, kỳ (ngày/tuần/tháng/toàn bộ), lọc **> 20.000.000 ₫**. Trình duyệt mở tab mới và gọi hộp thoại in — cần **cho phép popup** nếu bị chặn.

## Roadmap gợi ý

- [ ] JWT + role đồng bộ với `users` / `business_profile` (Prisma).
- [ ] CRUD REST/GraphQL thay cho mock `AppDataContext`.
- [ ] Upload chứng từ lên S3 / Supabase Storage.
- [ ] PDF phiếu thu/chi (backend).

## Giấy phép

Private / UNLICENSED — chỉnh trong `api/package.json` và thêm `LICENSE` khi công khai repo.

---

**TramCan E-Tax** — tài liệu cập nhật theo mã nguồn trong repo.
