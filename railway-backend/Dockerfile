FROM python:3.13-slim

WORKDIR /app

# Copy project files for package install
COPY pyproject.toml setup.py README.md ./
COPY avax_cli/ ./avax_cli/

# Install the full pyvax-cli package with verify extras
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e ".[verify]"

# Install FastAPI server dependencies
COPY railway-backend/requirements.txt ./railway-requirements.txt
RUN pip install --no-cache-dir -r railway-requirements.txt

# Copy the FastAPI server
COPY railway-backend/main.py .

# Run as non-root user for security
RUN useradd -m appuser
USER appuser

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
