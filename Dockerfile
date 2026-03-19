# ---------- Stage 1: Build frontend ----------
FROM node:20-alpine AS frontend-build
WORKDIR /work

# Install deps
COPY digital-trust/package.json digital-trust/package-lock.json ./digital-trust/
RUN cd digital-trust && npm ci

# Copy source and build
COPY digital-trust ./digital-trust
RUN cd digital-trust && npm run build

# ---------- Stage 2: Backend runtime ----------
FROM python:3.11-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# System deps (often helpful; can be trimmed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Install backend deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend ./backend

# Copy built frontend into backend folder (served by FastAPI)
COPY --from=frontend-build /work/digital-trust/dist ./backend/frontend_dist

# Expose port (platforms like Render will still set $PORT)
EXPOSE 8000

# Start (bind to $PORT if provided)
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]