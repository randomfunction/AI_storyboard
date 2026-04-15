# Use the official Python lightweight image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Prevent Python from writing .pyc files & keep stdout unbuffered for Render logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install production dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the standard port (Render will override this dynamically)
EXPOSE 8000

# Start Gunicorn bound to 0.0.0.0 and the Render dynamic PORT
CMD gunicorn -w 1 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:${PORT:-8000} main:app
