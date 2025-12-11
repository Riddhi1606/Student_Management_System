FROM python:3.11-slim

WORKDIR /app

# Install OS deps for pandas if required
RUN apt-get update && apt-get install -y build-essential libpq-dev --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend backend
COPY frontend frontend
COPY sample_students.csv sample_students.csv

EXPOSE 5000

ENV FLASK_APP=backend/app.py
ENV FLASK_RUN_HOST=0.0.0.0

CMD ["python", "backend/app.py"]
