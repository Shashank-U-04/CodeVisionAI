# CodeVisionAI backend image (FastAPI + native + Java tracers).
#
# Render builds and runs this. Heavier than a plain python image because the
# tracers need a real toolchain on PATH: gcc / g++ / gdb for C and C++, and
# the JDK (javac + java) for the Java JDI driver.

FROM python:3.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive

# - build-essential pulls in gcc, g++, libc dev headers
# - gdb is the inferior driver for the C/C++ tracer
# - default-jdk-headless gives us javac + java (Temurin equivalent on Debian)
# - tini reaps zombie tracer / inferior processes that Render's container
#   runtime would otherwise leak
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        gdb \
        default-jdk-headless \
        tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/api/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY apps/api ./apps/api

WORKDIR /app/apps/api

# Render injects $PORT; fall back to 8000 for local docker runs.
ENV PORT=8000
EXPOSE 8000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
