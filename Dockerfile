FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio base
WORKDIR /app

# Instalar dependencias
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copiar TODO el repo dentro del contenedor
COPY . /app/

# Ir a la carpeta donde está manage.py
WORKDIR /app/habitats

# Exponer puerto
EXPOSE 8000

# Comando para correr Django
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
