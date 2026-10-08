# ResQMesh Backend Service

FastAPI-powered backend for live telemetry ingestion, AI hazard risk assessment, and emergency evacuation management.

---

## 🚀 Deploying to Render (in 2 Steps)

### Method 1: Using Render Blueprint (Recommended)
1. In your [Render Dashboard](https://dashboard.render.com/), click **New +** → **Blueprint**.
2. Connect your GitHub repository: `ChaitanyaPalve/rescue-dashboard`.
3. Render will automatically detect `render.yaml`, set root directory to `backend`, install dependencies, and launch your API!

### Method 2: Manual Web Service Setup
1. Click **New +** → **Web Service**.
2. Connect your repo: `ChaitanyaPalve/rescue-dashboard`.
3. Fill in the service settings:
   - **Name**: `resq-backend`
   - **Language**: `Python 3`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
4. Click **Deploy Web Service**.

---

## 📡 Local Development

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (optional)
python -m venv venv
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server with auto-reload
uvicorn main:app --reload --port 8000
```

- API Base: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`
