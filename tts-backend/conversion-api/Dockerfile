# Dockerfile with architecture compatibility fixes
FROM python:3.10-slim AS base

WORKDIR /app

# Set environment variables for better compatibility
ENV PYTHONFAULTHANDLER=1 \
    PYTHONHASHSEED=random \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive \
    # Critical setting to force BLAS/BLIS to use non-optimized routines
    OPENBLAS_CORETYPE=ARMV8 \
    # Disable AVX2, AVX512 instructions
    CFLAGS="-march=x86-64 -mno-avx -mno-avx2 -msse4.2" \
    CXXFLAGS="-march=x86-64 -mno-avx -mno-avx2 -msse4.2"

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    curl \
    # git \
    # libsndfile1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and install basic build tools
RUN pip install --upgrade pip setuptools wheel

# Install numpy and spacy separately first with CPU compatibility flags
RUN pip install numpy --no-binary numpy
RUN pip install spacy --no-binary spacy

# Install spaCy model with compatibility flag
RUN python -m spacy download en_core_web_sm --no-deps

# Second stage to install remaining requirements
COPY requirements.txt .
RUN pip3 install --no-cache-dir gunicorn
RUN pip3 install --no-cache-dir -r requirements.txt

# Your application code
COPY app.py gunicorn_config.py parse_and_generate_audio.py celery_flask.py  ./

EXPOSE 3040
CMD ["gunicorn", "--config", "gunicorn_config.py", "app:flask_app", "--log-level", "debug"]
# gunicorn --config gunicorn_config.py app:flask_app --log-level debug