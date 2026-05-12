# Hướng dẫn cài đặt Monday AutomatedMail

## Yêu cầu

- Node.js 18+
- npm hoặc yarn
- Tài khoản Monday.com với Developer access
- Cloudflare account (cho deployment)
- Google Cloud project (cho Gmail OAuth)
- Microsoft Azure AD app (cho Outlook OAuth)

## Cài đặt

### 1. Clone repository

```bash
cd /Users/dvphuc/saigon-tech/monday-super-mail
```

### 2. Cài đặt dependencies

```bash
npm run install:all
```

## Cấu hình

### 3. Cấu hình Google OAuth

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Enable Gmail API:
   - APIs & Services → Library → Tìm "Gmail API" → Enable
4. Tạo OAuth 2.0 credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs:
     - `https://your-worker-url.workers.dev/auth/google/callback`
     - `http://localhost:8787/auth/google/callback` (cho local development)
5. Lưu Client ID và Client Secret

### 4. Cấu hình Microsoft OAuth

1. Truy cập [Azure Portal](https://portal.azure.com/)
2. Tạo App Registration mới:
   - Azure Active Directory → App registrations → New registration
   - Redirect URI: `https://your-worker-url.workers.dev/auth/microsoft/callback`
3. Cấu hình permissions:
   - API permissions → Add permission → Microsoft Graph → Mail.Send
   - Grant admin consent
4. Tạo client secret:
   - Certificates & secrets → New client secret
5. Lưu Application (client) ID và client secret

### 5. Cấu hình Backend

1. Copy `.env.example` thành `.env`:

```bash
cp frontend/.env.example frontend/.env
```

2. Trong `backend/wrangler.toml`, thêm secrets:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put MICROSOFT_CLIENT_ID
npx wrangler secret put MICROSOFT_CLIENT_SECRET
npx wrangler secret put MONDAY_API_KEY
npx wrangler secret put MONDAY_WEBHOOK_URL
```

### 6. Cấu hình Frontend

Trong `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:8787
```

## Chạy local development

### 7. Setup database (D1 local)

```bash
cd backend
npx wrangler d1 create SUPERMAIL_DB --local
npx wrangler d1 migrations apply SUPERMAIL_DB --local
```

### 8. Chạy backend

```bash
cd backend
npm run dev
```

Backend sẽ chạy trên `http://localhost:8787`

### 9. Chạy frontend

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy trên `http://localhost:8301`

## Tích hợp với Monday.com

### 10. Tạo Monday App

1. Truy cập [Monday Developers](https://developers.monday.com/)
2. Click "Build an App"
3. Cấu hình app:
   - Name: AutomatedMail
   - Description: Automated email sending with templates
4. Thêm feature:
   - Type: Board View
   - URL: `http://localhost:8301` (sau khi deployment sẽ đổi)
5. Lưu App ID và API Key

### 11. Test với Monday Tunnel

```bash
cd frontend
npx monday tunnel
```

Tunnel sẽ cung cấp URL để test trong Monday.com

## Deployment

### 12. Deploy Backend lên Cloudflare

```bash
cd backend
npx wrangler d1 create SUPERMAIL_DB
# Copy DATABASE_ID vào wrangler.toml
npx wrangler d1 migrations apply SUPERMAIL_DB
npx wrangler deploy -e production
```

### 13. Deploy Frontend

```bash
cd frontend
npm run build
# Upload dist folder tới hosting hoặc Cloudflare Pages
```

### 14. Cập nhật Monday App

1. Cập nhật URL trong Monday Developers dashboard
2. Thêm production URL làm redirect URI trong Google/Microsoft OAuth
3. Deploy app version trong Monday.com

## Sử dụng

### 15. Kết nối Email Account

1. Mở app trong Monday.com
2. Chọn "Kết nối với Google" hoặc "Kết nối với Microsoft"
3. Hoàn thành OAuth flow
4. Tài khoản sẽ được lưu và sẵn sàng sử dụng

### 16. Tạo Email Template

1. Chuyển đến trang "Mẫu Email"
2. Click "Tạo mẫu mới"
3. Điền thông tin:
   - Tên mẫu
   - Subject (có thể dùng variables như `{item_name}`)
   - Nội dung email (support HTML)
4. Lưu mẫu

### 17. Cấu hình Integration

1. Chuyển đến trang "Tích Hợp"
2. Chọn recipe type (6 loại):
   - Status Change: Gửi khi status thay đổi
   - Date Reached: Gửi khi đến due date
   - Person Assigned: Gửi khi có người được assign
   - Item Created: Gửi khi item mới tạo
   - Item Updated: Gửi khi item cập nhật
   - Button Click: Gửi khi button click
3. Chọn template để sử dụng
4. Cấu hình trigger conditions
5. Chọn các cột chứa email recipients
6. Lưu cấu hình

## Variables trong Email

- `{item_name}`: Tên của item
- `{item_id}`: ID của item
- Các column values: `{column_id}` (ví dụ: `{email}`, `{status}`)

## Troubleshooting

### OAuth không hoạt động

- Kiểm tra redirect URI trong Google/Microsoft console
- Đảm bảo backend URL đúng trong wrangler.toml

### Email không gửi được

- Kiểm tra access token còn hạn không
- Xem email logs trong backend
- Kiểm tra console logs cho errors

### Webhook không trigger

- Đảm bảo webhook đã được tạo trong Monday
- Kiểm tra integration đã active
- Test bằng cách thay đổi column value

## Testing

### Test OAuth flow

```bash
# Test Google OAuth
curl "http://localhost:8787/auth/google?board_id=5027603127"

# Test Microsoft OAuth
curl "http://localhost:8787/auth/microsoft?board_id=5027603127"
```

### Test template CRUD

```bash
# Create template
curl -X POST "http://localhost:8787/templates?board_id=5027603127" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "subject": "Test {item_name}",
    "body": "<h1>Hello</h1>",
    "attachments": []
  }'

# Get templates
curl "http://localhost:8787/templates?board_id=5027603127"
```

## Resources

- [Monday.com Developers](https://developers.monday.com/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Gmail API](https://developers.google.com/gmail/api)
- [Microsoft Graph API](https://docs.microsoft.com/graph/api/overview)
