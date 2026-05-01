# Breathing Monitor UI

This workspace contains a React frontend and a FastAPI backend for monitoring respiratory patients and microphone zones.

## Project Structure

- `frontend/` React + Vite UI
- `backend/` FastAPI audio analysis service
- `backend/pretrained_models/` model assets used by the backend

## Frontend

Install dependencies and start the development server:

```bash
cd frontend
npm install
npm run dev
```

Build for production:

```bash
cd frontend
npm run build
```

## Backend

Install Python dependencies from `backend/requirements.txt`, then start the API:

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

## Notes

- The root `requirements.txt` is a generated dependency snapshot and is ignored by default.
- The backend expects the bundled model files under `backend/` and `backend/pretrained_models/`.
- If you add new build outputs, local caches, or environment files, update `.gitignore` to keep them out of version control.