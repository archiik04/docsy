# Use a Python 3.11 slim base image
FROM python:3.11-slim

# Install system dependencies, including Tesseract OCR and languages used by Docsy OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    tesseract-ocr-ori \
    tesseract-ocr-ben \
    tesseract-ocr-tam \
    tesseract-ocr-tel \
    tesseract-ocr-kan \
    tesseract-ocr-mal \
    tesseract-ocr-mar \
    tesseract-ocr-guj \
    tesseract-ocr-pan \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /code

# Set Hugging Face cache directory to a writable path
ENV HF_HOME=/tmp/hf_cache
RUN mkdir -p /tmp/hf_cache && chmod -R 777 /tmp/hf_cache

# Copy requirements and install Python dependencies
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy application source code
COPY ./app /code/app

# Create upload directory and set correct permissions for Hugging Face Spaces (user ID 1000 compatibility)
RUN mkdir -p /code/uploads && chmod -R 777 /code/uploads

# Expose port 7860 (mandatory port for Hugging Face Spaces routing)
EXPOSE 7860

# Run uvicorn on port 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
