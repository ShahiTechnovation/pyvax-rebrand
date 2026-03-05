FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port (Railway sets PORT automatically, but we define default 8000 here)
EXPOSE 8000

# Run uvicorn server on host 0.0.0.0 and port $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
