# Dockerfile
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

WORKDIR /workspace/qt-ai

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy configuration and source files
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY src/ ./src/

# Expose Dashboard and API ports
EXPOSE 8050
EXPOSE 8000

# Set baseline runtime environment variables
ENV QT_NODE_COUNT=4096
ENV QT_ENTROPY_TARGET=0.121

CMD ["python3", "-m", "src.main"]
