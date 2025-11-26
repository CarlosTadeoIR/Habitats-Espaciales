FROM python:3.12-slim

# No generar .pyc y loguear sin buffer
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio base dentro del contenedor
WORKDIR /app

# Instalar dependencias
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt


COPY . /app/

# Exponer puerto de Django
EXPOSE 8000

# Comando por defecto: correr manage.py desde /app
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
