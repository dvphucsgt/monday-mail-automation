# Monday Supermail

Ứng dụng Monday.com để tự động hóa việc gửi email với mẫu có sẵn.

## Tính năng

- 🎨 Thiết kế mẫu email linh hoạt với rich text, hình ảnh, GIF
- 🔄 Tích hợp trực tiếp vào board Monday.com
- ⚡ 6 Integration Recipes để tự động gửi email
- 📎 Quản lý file đính kèm từ nhiều nguồn
- 🎯 Hỗ trợ nhiều loại cột người nhận
- 🔐 Kết nối tài khoản Google/Microsoft

## 6 Integration Recipes

1. **Status Change**: Gửi email khi status column thay đổi
2. **Date Reached**: Gửi email khi đến due date
3. **Person Assigned**: Gửi email khi item được assign
4. **Item Created**: Gửi email khi item mới được tạo
5. **Item Updated**: Gửi email khi item được cập nhật
6. **Button Click**: Gửi email khi button được click

## Cài đặt

```bash
npm run install:all
```

## Development

```bash
npm run dev
```

Frontend sẽ chạy trên port 8301 (monday tunnel) và backend trên port 8787.

## Build

```bash
npm run build
```

## Tech Stack

- **Frontend**: React, Vite, Monday SDK, @vibe/core
- **Backend**: Cloudflare Workers, D1 Database, TypeScript
- **Email**: Gmail API, Microsoft Graph API

## License

MIT
