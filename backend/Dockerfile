FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Create static directory
RUN mkdir -p staticfiles

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Expose port
EXPOSE 8000

# Default command for running server
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "eld_planner.wsgi:application"]

# Celery worker command
# CMD ["celery", "-A", "eld_planner", "worker", "--loglevel=info", "--concurrency=2"]

# Celery beat command
# CMD ["celery", "-A", "eld_planner", "beat", "--loglevel=info"]