FROM python:3.9-slim

WORKDIR /app

# Install Python dependencies
COPY railway-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the canonical avax_cli package (single source of truth)
COPY avax_cli/ ./avax_cli/

# Copy the FastAPI server
COPY railway-backend/main.py .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
