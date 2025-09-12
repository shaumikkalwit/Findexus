# Use an official lightweight Python image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy and install dependencies first to leverage Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . /app

# Command to run your FastAPI app with Uvicorn
# Render will automatically use the PORT environment variable
CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--port", "8000"]