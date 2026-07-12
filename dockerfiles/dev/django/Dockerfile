FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /usr/src/app
COPY ./requirements.txt .
RUN pip3 install --upgrade pip && pip3 install -r requirements.txt 
COPY  ./core .
# COPY .env .env