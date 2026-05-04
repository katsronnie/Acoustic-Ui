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

To point the UI at a deployed backend, set `VITE_BACKEND_URL` before starting Vite:

```bash
VITE_BACKEND_URL=https://your-app.hf.space
```

Build for production:

```bash
cd frontend
npm run build
```

To deploy the frontend on Vercel, set the project root to `frontend/`, add this environment variable in the Vercel project settings, and deploy the Vite build output:

```bash
VITE_BACKEND_URL=https://hospital-ward-acoustic-ui-backend.hf.space
```

Vercel will serve the React app globally, while the backend stays on Hugging Face Spaces.

## Backend

Install Python dependencies from `backend/requirements.txt`, then start the API:

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

## Hugging Face deployment

The backend can either run the model locally or forward `/analyze` requests to a Hugging Face-hosted endpoint.

To host the backend itself on Hugging Face Spaces, use the Dockerfile in `backend/` and expose port `7860`. The Space will serve the same `/health` and `/analyze` routes as the local backend.

To use Hugging Face inference, set these environment variables before starting the backend:

```bash
HF_ANALYZE_URL=https://your-space-or-endpoint.hf.space/analyze
HF_TOKEN=your_hugging_face_token
HF_TIMEOUT_SECONDS=120
```

When `HF_ANALYZE_URL` is set, the backend will proxy the uploaded audio to that Hugging Face API and return the JSON response without changing the frontend contract.

If you want to host the model on Hugging Face Spaces, make sure the Space exposes the same multipart form fields used here: `file` for the WAV upload and optional `bed_id`.

## Notes

- The root `requirements.txt` is a generated dependency snapshot and is ignored by default.
- The backend expects the bundled model files under `backend/` and `backend/pretrained_models/`.
- If you add new build outputs, local caches, or environment files, update `.gitignore` to keep them out of version control.