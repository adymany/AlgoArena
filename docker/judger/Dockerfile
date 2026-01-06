FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3 \
    python3-pip \
    openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN gcc --version && \
    g++ --version && \
    python3 --version && \
    java -version

# Create a non-root user for executing code (optional scaffolding for now)
RUN useradd -m -s /bin/bash sandbox

WORKDIR /home/sandbox
