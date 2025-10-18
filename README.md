# Dashboard Fullstack Project

This project contains a simple React frontend (Vite) and an Express backend.
It demonstrates a sidebar + charts dashboard using `lucide-react` icons and `recharts` charts.
You can run frontend and backend separately during development.

## Quick start

### Backend
```bash
cd backend
npm install
npm run dev       # starts server on http://localhost:4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev       # starts vite dev server on http://localhost:5173
```

The frontend fetches sample metrics from the backend (`/api/metrics` and `/api/weekly`).


## Python backend

A Python Flask backend has been added at `python_backend/` that serves the same demo data as the Node backend.

To run:
```bash
cd dashboard_project/dashboard_project/python_backend
python -m venv venv
source venv/bin/activate    # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py
```
