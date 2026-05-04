#!/bin/bash
# Script de construcción para entornos Linux (AWS EC2, etc.)

echo "Instalando dependencias del Backend..."
cd backend
npm install

echo "Instalando dependencias del Frontend..."
cd ../frontend
npm install

echo "Construyendo Frontend..."
npm run build

echo "Copiando build al Backend..."
rm -rf ../backend/public
cp -r dist ../backend/public

echo "¡Construcción terminada! Listo para desplegar con PM2."
