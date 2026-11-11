# Vòng quay quỹ phường anh em

React + Vite · Node/Express · MySQL 8. Mỗi tháng backend chọn ngẫu nhiên 1 người nhận quỹ, kết quả ở trạng thái **chờ xác nhận** cho tới khi bấm **XÁC NHẬN**.

## Chạy trên máy local

Yêu cầu: Node.js 18+, MySQL 8.0+.

```bash
# 1) Backend
cd server
npm install
cp .env.example .env        # sửa DB_USER / DB_PASSWORD / ADMIN_PASSWORD / JWT_SECRET
npm run db:seed             # tạo database fund_wheel, các bảng, 7 thành viên mẫu
npm run dev                 # http://localhost:4000

# 2) Frontend (terminal khác)
cd client
npm install
npm run dev                 # http://localhost:5173  (proxy /api -> :4000)
```

Mở http://localhost:5173 → "Quản trị viên" (góc dưới sidebar) → đăng nhập (`admin` / mật khẩu trong `.env`) → **Quản lý vòng** → **Bắt đầu vòng 1** → **Vòng quay**.
Chỉ chạy `npm run db:init` nếu muốn tạo bảng mà không có thành viên mẫu.

## Các giai đoạn & file

| GĐ | File | Chức năng |
|----|------|-----------|
| 1. Nghiệp vụ & DB | `database/schema.sql` | `users`, `rounds`, `round_members` (snapshot người tham gia vòng), `draw_results`, `settings` + khóa ngoại, index, ràng buộc chống trùng |
| 2. Khởi tạo | `server/package.json`, `server/.env.example`, `client/package.json`, `client/vite.config.js` | Cấu hình 2 dự án, proxy `/api` |
| 3-4. Backend + MySQL | `server/src/db.js` | Pool mysql2, helper `tx()` (transaction), `HttpError` |
| | `server/src/services/roundService.js` | **Toàn bộ logic quay / xác nhận / hủy / tạo vòng** (transaction + khóa dòng) |
| | `server/src/routes/*.js` | `members`, `rounds`, `history`, `dashboard`, `settings`, `auth` |
| | `server/src/middleware/auth.js` | JWT admin, `asyncH` |
| | `server/scripts/initDb.js` | Tạo DB / seed |
| 5. Giao diện | `client/src/App.jsx`, `components/Layout.jsx`, `pages/*` | Sidebar, Dashboard, Vòng quay, Thành viên, Lịch sử, Quản lý vòng, Cài đặt |
| 6. Vòng quay | `client/src/components/Wheel.jsx` | SVG; chỉ **hiển thị**, xoay tới ô của người mà backend đã chọn |
| 7. Xác nhận | `client/src/components/ResultModal.jsx`, `pages/Spin.jsx` | Hộp thoại Xác nhận / Hủy (admin), khôi phục kết quả chờ khi tải lại trang |
| 8. Lịch sử & Dashboard | `pages/History.jsx`, `pages/Dashboard.jsx` | Tìm kiếm, lọc vòng / tháng / năm / trạng thái, sắp xếp |
| 9. Kiểm thử | `server/scripts/testApi.js` | `npm run test:api` |

## Cơ chế đảm bảo kết quả đúng

1. **Backend chọn ngẫu nhiên** bằng `crypto.randomInt` trong `drawNext()`; frontend chỉ nhận kết quả và xoay vòng.
2. **Tuần tự hóa**: mỗi lượt quay / xác nhận / hủy chạy trong transaction và `SELECT ... FOR UPDATE` dòng `rounds`. Hai người bấm cùng lúc → một người thành công, người kia nhận `409`.
3. **Ràng buộc ở tầng DB** (lớp bảo vệ cuối, kể cả khi code sai):
   - `UNIQUE (round_id, active_user_key)`: một người chỉ có tối đa 1 kết quả pending/confirmed mỗi vòng.
   - `UNIQUE (round_id, pending_key)`: mỗi vòng tối đa 1 kết quả đang chờ xác nhận.
   - `UNIQUE (active_flag)`: chỉ 1 vòng `in_progress` tại một thời điểm.
   - Mọi khóa ngoại là `RESTRICT` → không thể xóa dữ liệu làm mất lịch sử.
4. **Không mất lịch sử**: vòng mới chỉ tạo `rounds` + `round_members` mới; kết quả cũ giữ nguyên. Trạng thái "đã nhận" được suy ra từ `draw_results` của vòng đó nên không có cột nào phải reset.
5. **Hủy kết quả** đặt `status='cancelled'` (bản ghi vẫn còn để đối soát), người đó quay lại danh sách chưa nhận.
6. Rate-limit cho quay/xác nhận/đăng nhập (`express-rate-limit`).

## Phân quyền
- Công khai: xem dữ liệu, **quay**, **xác nhận**.
- Chỉ admin (JWT): thêm / sửa / xóa thành viên, bắt đầu vòng mới, **hủy kết quả**, đổi cài đặt.
- Muốn bắt buộc đăng nhập mới được quay: thêm `requireAdmin` vào route `draw` / `confirm` trong `server/src/routes/rounds.js`.

## Quy tắc nghiệp vụ đã chọn (có thể đổi)
- Bắt đầu vòng cần **đúng** `group_size` (mặc định 7) thành viên đang hoạt động; danh sách này được chốt cho cả vòng.
- Không xóa thành viên đã tham gia vòng nào; không chuyển "Không hoạt động" khi đang thuộc vòng chưa xong.
- Số tiền nhận = tiền đóng mỗi người × số thành viên (chốt lúc tạo vòng). Tháng/năm nhận = thời điểm **xác nhận**, theo `APP_TIMEZONE`.

## Kiểm thử
`npm run test:api` (chạy trên DB thử nghiệm, server khởi động với `RATE_LIMIT_MAX=1000`) kiểm tra: quay song song 4 request → đúng 1 thành công; không quay khi chờ xác nhận; tải lại vẫn thấy kết quả chờ; xác nhận song song → đúng 1 thành công; 7 lượt ra 7 người khác nhau; vòng tự hoàn thành; không quay khi vòng đã xong; không tạo vòng thứ 2 khi vòng đang chạy; thao tác admin cần token.
Kiểm thử tay trên UI: tải lại trang giữa lúc chờ xác nhận, hủy kết quả (admin) rồi quay lại, xóa thành viên đã có lịch sử, bắt đầu vòng 2 và kiểm tra lịch sử vòng 1 còn nguyên.
