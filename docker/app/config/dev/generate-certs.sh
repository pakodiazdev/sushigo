#!/bin/bash

set -e

CERT_DIR="/app/docker/app/config/dev/cert"
DOMAIN="sushigo.local"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔐 Configurando certificados SSL para ${DOMAIN}...${NC}"

# Crear directorio si no existe
mkdir -p "$CERT_DIR"

# Verificar si los certificados ya existen
if [ -f "$CERT_DIR/${DOMAIN}.crt" ] && [ -f "$CERT_DIR/${DOMAIN}-key.pem" ]; then
    echo -e "${YELLOW}✓ Certificados existentes encontrados. Reutilizando...${NC}"
    exit 0
fi

echo -e "${GREEN}📜 Generando nuevos certificados SSL...${NC}"

# Instalar CA local de mkcert
export CAROOT="$CERT_DIR"
mkcert -install

# Generar certificados para el dominio
cd "$CERT_DIR"
mkcert -cert-file "${DOMAIN}.crt" -key-file "${DOMAIN}-key.pem" "$DOMAIN" "*.${DOMAIN}" localhost 127.0.0.1 ::1

# Verificar que se crearon los archivos
if [ -f "$CERT_DIR/${DOMAIN}.crt" ] && [ -f "$CERT_DIR/${DOMAIN}-key.pem" ]; then
    echo -e "${GREEN}✓ Certificados SSL generados exitosamente${NC}"
    echo -e "${GREEN}  - Certificado: ${CERT_DIR}/${DOMAIN}.crt${NC}"
    echo -e "${GREEN}  - Clave: ${CERT_DIR}/${DOMAIN}-key.pem${NC}"

    # Establecer permisos apropiados
    chmod 644 "${DOMAIN}.crt"
    chmod 600 "${DOMAIN}-key.pem"

    echo -e "${YELLOW}⚠️  Para confiar en el certificado en tu navegador:${NC}"
    echo -e "${YELLOW}   1. Importa el archivo: ${CERT_DIR}/rootCA.pem${NC}"
    echo -e "${YELLOW}   2. En Windows: Doble click en rootCA.crt y sigue el asistente${NC}"
    echo -e "${YELLOW}   3. En Mac: Agregar a Keychain Access y marcar como confiable${NC}"
    echo -e "${YELLOW}   4. En Linux: Copiar a /usr/local/share/ca-certificates/ y ejecutar update-ca-certificates${NC}"
else
    echo -e "${RED}✗ Error generando certificados SSL${NC}"
    exit 1
fi
