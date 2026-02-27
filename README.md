# ScrapTrade Pro — Complete MERN Stack Application

A production-ready scrap trading business management system for tracking incoming/outgoing bills and payments, organized by Indian Financial Year.

---

## 📁 Folder Structure

```
scrap-trade/
├── backend/
│   ├── config/
│   │   ├── db.js               # MongoDB connection
│   │   └── cloudinary.js       # Cloudinary + multer config
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── partyController.js
│   │   ├── purchaseController.js
│   │   ├── saleController.js
│   │   ├── dashboardController.js
│   │   └── reportController.js
│   ├── middleware/
│   │   ├── auth.js             # JWT cookie protection middleware
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Party.js
│   │   ├── Purchase.js
│   │   ├── Sale.js
│   │   └── Payment.js          # Subdocument schema
│   ├── routes/
│   │   ├── auth.js
│   │   ├── parties.js
│   │   ├── purchases.js
│   │   ├── sales.js
│   │   ├── dashboard.js
│   │   └── reports.js
│   ├── utils/
│   │   ├── financialYear.js    # FY calculation logic
│   │   └── jwt.js
│   ├── server.js
│   ├── package.json
│   └── .env.sample
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ui/index.jsx        # Reusable UI components
    │   │   ├── layout/
    │   │   │   ├── Sidebar.jsx
    │   │   │   └── Navbar.jsx
    │   │   └── modals/
    │   │       └── PaymentModal.jsx
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   └── AppContext.jsx      # Theme + Financial Year
    │   ├── layouts/
    │   │   └── MainLayout.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Purchases.jsx
    │   │   ├── PurchaseForm.jsx
    │   │   ├── Sales.jsx
    │   │   ├── SaleForm.jsx
    │   │   ├── Parties.jsx
    │   │   ├── PartyLedger.jsx
    │   │   └── Reports.jsx
    │   ├── services/
    │   │   └── api.js              # All API calls with axios
    │   ├── utils/
    │   │   └── financialYear.js
    │   ├── App.jsx
    │   ├── index.js
    │   └── index.css
    ├── package.json
    ├── tailwind.config.js
    └── .env.sample
```

---

## 🗄️ Database Schemas

### User
- `name`, `email`, `password` (bcrypt hashed), `role` (admin), `businessName`

### Party
- `name`, `mobile`, `address`, `gstNumber`, `type` (supplier/customer/both), `createdBy`

### Purchase / Sale
- `billNumber`, `party` (ref Party), `materialType`, `weight`, `weightUnit`, `ratePerKg`, `totalAmount`
- `billDate`, `dueDate`, `financialYear` (auto-calculated), `pdfUrl`, `pdfPublicId`
- `payments[]` (amount, paymentDate, mode, note, reference)
- `notes`, `createdBy`
- **Virtuals**: `paidAmount`, `pendingAmount`, `paymentStatus`, `isOverdue`

### Payment (Subdocument)
- `amount`, `paymentDate`, `mode` (Cash/Bank/UPI/Cheque), `note`, `reference`

---

## 📅 Financial Year Logic

- Indian FY: **April 1 → March 31**
- Date in April–December of year Y → `Y-{Y+1}` (e.g., May 2025 → `2025-2026`)
- Date in January–March of year Y → `{Y-1}-Y` (e.g., Feb 2026 → `2025-2026`)
- Auto-calculated from `billDate` on create/update
- Stored as string in every Purchase/Sale document

---

## 💰 Payment Logic

- `paidAmount` = Sum of all entries in `payments[]` array
- `pendingAmount` = `totalAmount - paidAmount`
- `paymentStatus`:
  - `Paid` → paidAmount ≥ totalAmount
  - `Partial` → 0 < paidAmount < totalAmount
  - `Pending` → paidAmount = 0
- `isOverdue` → dueDate < today AND pendingAmount > 0 → status shown as **Overdue**
- Never store redundant `paidAmount` — always computed from payments array

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.sample .env
# Edit .env with your values
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.sample .env
# Edit REACT_APP_API_URL if needed
npm start
```

### 3. Environment Variables

**Backend `.env`:**
```
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/scrap-trade
JWT_SECRET=your_minimum_32_character_secret_key_here
JWT_EXPIRES_IN=7d
COOKIE_EXPIRES_IN=7
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

**Frontend `.env`:**
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Purchases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchases?financialYear=2025-2026` | List with filters |
| POST | `/api/purchases` | Create (multipart with pdf) |
| GET | `/api/purchases/:id` | Get one |
| PUT | `/api/purchases/:id` | Update |
| DELETE | `/api/purchases/:id` | Delete |
| POST | `/api/purchases/:id/add-payment` | Add payment |
| DELETE | `/api/purchases/:id/payments/:paymentId` | Delete payment |

### Sales (same structure as Purchases)
- `/api/sales/*`

### Parties
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parties` | List |
| POST | `/api/parties` | Create |
| PUT | `/api/parties/:id` | Update |
| DELETE | `/api/parties/:id` | Delete |
| GET | `/api/parties/:id/ledger` | Party ledger |

### Dashboard
- `GET /api/dashboard?financialYear=2025-2026`

### Reports (CSV Export)
- `GET /api/reports/purchases/export?financialYear=2025-2026`
- `GET /api/reports/sales/export?financialYear=2025-2026`

---

## ☁️ Deployment

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set **Root Directory**: `backend`
4. **Build Command**: `npm install`
5. **Start Command**: `node server.js`
6. Add all environment variables from `.env`
7. Set `NODE_ENV=production`
8. Set `CLIENT_URL=https://your-frontend.vercel.app`

### Frontend → Vercel

1. Import project on [vercel.com](https://vercel.com)
2. Set **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `build`
5. Add environment variable:
   - `REACT_APP_API_URL=https://your-backend.onrender.com/api`

### Important for Production
- Backend `NODE_ENV=production` enables secure cookies with `SameSite=none`
- Frontend must be served over HTTPS for cookies to work cross-origin
- Add your Vercel domain to Cloudinary's allowed origins

---

## ✨ Features

- 🔐 Cookie-based JWT authentication
- 📅 Auto Indian Financial Year detection from bill date
- 💰 Dynamic payment tracking (paid/partial/pending/overdue)
- 📄 PDF/image upload via Cloudinary
- 📊 Dashboard with Recharts analytics
- 📋 Party ledger with complete transaction history
- 📥 CSV export for purchases and sales
- 🌙 Dark/Light mode with persistence
- 🔍 Filters by date, party, status, search
- ✅ Confirmation dialogs before delete operations
- 📱 Responsive design for desktop and tablet
