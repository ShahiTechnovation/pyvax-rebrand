FROM python:3.11-slim

LABEL maintainer="PyVax Team <team@pyvax.io>"
LABEL description="PyVax CLI — Python to EVM transpiler and Project Classified Web3 AI Agent framework"
LABEL version="1.2.0"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# Copy project files
COPY setup.py pyproject.toml README.md ./
COPY avax_cli/ ./avax_cli/

# Install PyVax in editable mode
RUN pip install --no-cache-dir -e ".[dev]"

# Verify installation
RUN pyvax version

# Default working directory for user projects
WORKDIR /workspace

# Default command
ENTRYPOINT ["pyvax"]
CMD ["--help"]
