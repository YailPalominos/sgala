# Imagen del agente (Python + socket.io)
FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .

# Puerto del socket del agente
EXPOSE 4700

CMD ["python", "main.py"]
