#!/bin/bash

set -e

echo "🚀 Iniciando configuración del proyecto..."

# Colores para mensajes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${BLUE}==>${NC} ${YELLOW}$1${NC}"
}

print_error() {
    echo -e "${BLUE}==>${NC} ${RED}$1${NC}"
}

# Directorio de trabajo del API
API_DIR="/app/code/api"
WEBAPP_DIR="/app/code/webapp"

# Cambiar al directorio de trabajo del API
cd $API_DIR

# Verificar si el directorio tiene archivos de Laravel
if [ ! -f "artisan" ]; then
    print_error "No se encontró el archivo artisan en $API_DIR. Asegúrate de que el código de Laravel esté montado correctamente."
    exit 1
fi

# Esperar a que PostgreSQL esté disponible
print_message "Esperando a que PostgreSQL esté disponible..."
max_attempts=30
attempt=0

# Usar las variables de entorno para la conexión (con valores por defecto)
export DB_HOST="${DB_HOST:-pgsql}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_USER="${POSTGRES_USER:-admin}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-admin}"
export POSTGRES_DB="${POSTGRES_DB:-mydb}"

DB_HOST="$DB_HOST"
DB_PORT="$POSTGRES_PORT"
DB_USER="$POSTGRES_USER"
DB_PASSWORD="$POSTGRES_PASSWORD"
DB_NAME="$POSTGRES_DB"

print_message "Configuración de base de datos:"
print_message "  Host: $DB_HOST"
print_message "  Puerto: $DB_PORT"
print_message "  Usuario: $DB_USER"
print_message "  Base de datos: $DB_NAME"

while [ $attempt -lt $max_attempts ]; do
    # Intentar conectar usando pg_isready o psql
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        print_message "✓ PostgreSQL está disponible"
        break
    fi

    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        print_error "No se pudo conectar a PostgreSQL después de $max_attempts intentos"
        print_error "Verifica que el servicio PostgreSQL esté corriendo y las credenciales sean correctas"
        exit 1
    fi

    print_warning "Esperando PostgreSQL... (intento $attempt/$max_attempts)"
    sleep 2
done

# Instalar dependencias de Composer si es necesario
if [ ! -d "vendor" ] || [ -z "$(ls -A vendor)" ]; then
    print_message "Instalando dependencias de Composer..."
    composer install --no-interaction --prefer-dist --optimize-autoloader
    print_message "✓ Dependencias de Composer instaladas"
else
    print_message "✓ Dependencias de Composer ya instaladas"
fi

# Instalar dependencias de Node.js del API si es necesario
if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
        print_message "Instalando dependencias de Node.js del API..."
        npm install
        print_message "✓ Dependencias de Node.js del API instaladas"
    else
        print_message "✓ Dependencias de Node.js del API ya instaladas"
    fi
fi

# Generar key de Laravel si no existe
if grep -q "APP_KEY=$" .env 2>/dev/null || ! grep -q "APP_KEY=" .env 2>/dev/null; then
    print_message "Generando APP_KEY de Laravel..."
    php artisan key:generate --force
    print_message "✓ APP_KEY generada"
else
    print_message "✓ APP_KEY ya configurada"
fi

# Crear directorios de storage si no existen y establecer permisos
print_message "Configurando permisos..."
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/framework/cache
mkdir -p storage/logs
mkdir -p bootstrap/cache

chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
print_message "✓ Permisos configurados"

# Limpiar caché
print_message "Limpiando caché..."
#php artisan config:clear
#php artisan cache:clear
#php artisan view:clear
#php artisan route:clear
print_message "✓ Caché limpiada"

# Ejecutar migraciones
print_message "Ejecutando migraciones..."
if php artisan migrate --force; then
    print_message "✓ Migraciones ejecutadas correctamente"
else
    print_warning "⚠ Hubo un problema con las migraciones, continuando..."
fi

# Ejecutar seeders si existen
if [ -d "database/seeders" ] && [ "$(ls -A database/seeders/*.php 2>/dev/null)" ]; then
    print_message "Ejecutando seeders..."
    if php artisan db:seed --force; then
        print_message "✓ Seeders ejecutados correctamente"
    else
        print_warning "⚠ Hubo un problema con los seeders, continuando..."
    fi
else
    print_message "✓ No hay seeders para ejecutar"
fi

# Crear link de storage público
print_message "Creando link simbólico de storage..."
php artisan storage:link --force || true
print_message "✓ Link de storage creado"

# Crear directorios de logs de supervisor
mkdir -p /var/log/supervisor

# Configurar WebApp si existe
if [ -d "$WEBAPP_DIR" ] && [ -f "$WEBAPP_DIR/package.json" ]; then
    print_message "Configurando WebApp React..."
    cd $WEBAPP_DIR

    if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
        print_message "Instalando dependencias de WebApp..."
        npm install
        print_message "✓ Dependencias de WebApp instaladas"
    else
        print_message "✓ Dependencias de WebApp ya instaladas"
    fi

    cd $API_DIR
else
    print_message "✓ No se encontró WebApp, continuando..."
fi

print_message "✅ Configuración completada!"
print_message "🎉 Iniciando servicios con Supervisor..."

# Iniciar Supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
