# Totienta - Cây Gia Phả

Ứng dụng quản lý cây gia phả trực tuyến được xây dựng với **Next.js 14 App Router** và **TypeScript**.

## Tính năng

- 🌳 Hiển thị cây gia phả theo cấu trúc phân cấp
- 👤 Quản lý thông tin thành viên (thêm, sửa, xóa)
- 📷 Upload ảnh đại diện (hỗ trợ HEIC)
- 🔗 Chia sẻ cây gia phả qua link
- 🔐 Xác thực người dùng
- 📱 Responsive design
- 🔍 SEO-friendly với dynamic metadata
- 🔒 Type-safe với TypeScript

## Cài đặt

```bash
# Clone repo
git clone <your-repo>
cd totienta-nextjs

# Cài dependencies
npm install

# Copy file env mẫu
cp .env.local.example .env.local

# Chỉnh sửa .env.local với API URL của bạn

# Chạy development server
npm run dev
```

## Scripts

```bash
npm run dev          # Chạy development server
npm run build        # Build production
npm run start        # Chạy production server
npm run lint         # Kiểm tra linting
npm run type-check   # Kiểm tra TypeScript types
```

## Cấu trúc thư mục

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Trang chủ
│   ├── login/page.tsx       # Trang đăng nhập
│   ├── register/page.tsx    # Trang đăng ký
│   ├── members/page.tsx     # Trang quản lý gia phả (protected)
│   └── [viewCode]/          # Dynamic route cho chia sẻ
│       ├── page.tsx
│       └── ViewAccessClient.tsx
├── components/               # React components
│   ├── Navbar.tsx
│   ├── FamilyTree.tsx
│   ├── MemberCard.tsx
│   ├── AddMemberModal.tsx
│   └── EditMemberModal.tsx
├── contexts/                 # React contexts
│   └── AuthContext.tsx
├── hooks/                    # Custom hooks
│   └── useDeviceType.ts
├── lib/                      # Utilities
│   ├── api.ts               # Axios instance
│   └── formatDate.ts
├── styles/                   # CSS
│   └── globals.css
└── types/                    # TypeScript types
    ├── index.ts             # Main type definitions
    └── heic2any.d.ts        # Module declaration
```

## Routes

| Route | Mô tả |
|-------|-------|
| `/` | Trang chủ |
| `/login` | Đăng nhập |
| `/register` | Đăng ký |
| `/members` | Quản lý cây gia phả (cần đăng nhập) |
| `/[viewCode]` | Xem gia phả được chia sẻ |

## TypeScript Types

Các type chính được định nghĩa trong `src/types/index.ts`:

```typescript
interface Member {
  _id: string;
  name: string;
  gender: 'male' | 'female';
  birthday?: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  isAlive: boolean;
  avatar?: string;
  phoneNumber?: string;
  address?: string;
  spouse?: Spouse[];
  deathDate?: string;
  parent?: string | Member | null;
  children: (string | Member)[];
  customFields?: CustomField[];
}
```

## SEO

Next.js App Router hỗ trợ SEO tốt hơn Vite:

- **Static Metadata**: Định nghĩa trong `layout.tsx` và `page.tsx`
- **Dynamic Metadata**: Sử dụng `generateMetadata()` cho dynamic routes
- **Open Graph**: Hỗ trợ chia sẻ trên mạng xã hội
- **Sitemap**: Có thể thêm `sitemap.ts` nếu cần

## Deploy

### Vercel (Khuyến nghị)

```bash
npm i -g vercel
vercel
```

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## Backend

Backend vẫn giữ nguyên, chỉ cần đảm bảo CORS cho phép domain Next.js.

```javascript
// server.js
app.use(cors({
  origin: ['http://localhost:3000', 'https://totienta.com'],
  credentials: true
}));
```

## So sánh với Vite (phiên bản cũ)

| Tính năng | Vite + JS | Next.js + TS |
|-----------|-----------|--------------|
| SEO | Client-side only | Server-side rendering |
| Routing | react-router-dom | Built-in App Router |
| Meta tags | Cần thư viện thêm | Native support |
| Type safety | Không | Có TypeScript |
| Performance | Good | Better (automatic optimization) |
| Image optimization | Manual | Built-in next/image |

## License

MIT
