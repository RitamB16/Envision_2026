# ⚡ Envision'26 - Tech Fest Platform

Envision'26 is a full-stack, high-performance web platform built for managing tech fest event registrations, automatic team invitations, magic link sign-ins, Upstash Redis catalog caching, and Razorpay UPI payments.

---

## 🚀 Tech Stack

### **Frontend**
* **Framework**: React 18 + Vite + TypeScript
* **State & Data Caching**: `@tanstack/react-query`
* **Styling**: Tailwind CSS + Cyberpunk Glassmorphism Design System
* **3D Graphics & Motion**: Three.js + `@react-three/fiber` + GSAP
* **OAuth**: Google OAuth 2.0 (`@react-oauth/google`)
* **Payments**: Razorpay Checkout JS SDK & Direct Razorpay.me UPI

### **Backend**
* **Framework**: FastAPI (Python 3.11/3.12/3.14)
* **Database**: PostgreSQL (Supabase) via SQLAlchemy ORM
* **Caching & Invalidation**: Upstash Redis TLS + `fastapi-cache2`
* **Authentication**: Secure HttpOnly Cookie + JWT + Google OAuth2 Token Verification
* **Background Tasks**: Asyncio Sweeper for abandoned registration seat releases
* **Security & Rate Limiting**: `slowapi` rate limiters & strict CORS middleware

---

## 🛠️ Project Structure

```
Envision_26/
├── start_all.bat             # Windows 1-click launcher for Backend & Frontend
├── start_backend.bat         # Windows Backend server launcher
├── start_frontend.bat        # Windows Frontend server launcher
├── docker-compose.yml        # Multi-container Docker deployment configuration
├── backend/                  # FastAPI Python backend server
│   ├── Dockerfile           # Backend container build instructions
│   ├── Procfile             # Render / Railway deployment command
│   ├── auth.py              # Google OAuth & Magic link authentication
│   ├── cache.py             # Upstash Redis & FastAPICache initialization
│   ├── config.py            # Pydantic environment configuration
│   ├── database.py          # SQLAlchemy PostgreSQL connection pool
│   ├── events.py            # Events catalog & registration logic
│   ├── main.py              # FastAPI app instance, CORS & background tasks
│   ├── models.py            # Database tables schema
│   ├── payments.py          # Razorpay order creation & signature verification
│   ├── schemas.py           # Pydantic request/response models
│   ├── sweeper.py           # Background 15-minute abandoned registration sweeper
│   └── webhooks.py          # Razorpay server-to-server webhook listener
├── frontend/                 # React TypeScript Vite frontend
│   ├── Dockerfile           # Frontend container build instructions (Nginx)
│   ├── vercel.json          # Vercel deployment rewrite rules
│   ├── src/
│   │   ├── components/      # UI components & PaymentCheckout
│   │   ├── pages/           # Page routes (Events, Dashboard, Login, Register)
│   │   ├── utils/           # API utilities & React Query client
│   │   └── App.tsx          # Main application & routing
└── README.md
```

---

## 💻 Running on Windows

### Quickest Option: 1-Click Batch Script
Double-click `start_all.bat` (or run it in CMD / PowerShell):
```cmd
start_all.bat
```
This automatically sets up Python virtual environments and Node modules if needed, then starts both the Backend (`http://127.0.0.1:8000`) and Frontend (`http://localhost:5173`).

---

### Manual Setup on Windows (CMD / PowerShell)

#### 1. Backend Setup
```cmd
cd backend

:: Create virtual environment & activate (Windows)
python -m venv venv
venv\Scripts\activate.bat

:: Install dependencies
pip install -r requirements.txt

:: Run FastAPI server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

#### 2. Frontend Setup
```cmd
cd frontend

:: Install node dependencies
npm install

:: Run Vite dev server
npm run dev
```

---

## 🐋 Docker Deployment (Windows / Linux / Mac)

You can run the entire platform locally or on a server with Docker Desktop:

```cmd
:: Build and start both containers
docker-compose up --build -d
```
* **Frontend**: Available at `http://localhost:5173`
* **Backend**: Available at `http://localhost:8000`

---

## 🌐 Cloud Deployment Options

### 1. Frontend Deployment (Vercel / Netlify)
1. Push the repository to GitHub.
2. Import the project on [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Set Environment Variables:
   - `VITE_API_BASE_URL` = `https://your-backend-url.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID` = `your_google_client_id`
   - `VITE_RAZORPAY_KEY_ID` = `your_razorpay_key_id`
5. Deploy! (`vercel.json` ensures SPA routes like `/dashboard` work without 404 errors).

### 2. Backend Deployment (Render / Railway)
1. Import the repository on [Render](https://render.com) or [Railway](https://railway.app).
2. Set **Root Directory** to `backend`.
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add all Environment Variables from `backend/.env`.

---

## 🔒 Security & Secrets
The `.gitignore` file excludes sensitive `.env` files and compiled assets. Always set your production environment variables directly in your deployment provider settings.
