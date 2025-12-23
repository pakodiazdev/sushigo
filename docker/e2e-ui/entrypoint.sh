#!/bin/bash
set -e

# Limpiar datos de Chrome/Chromium para evitar HSTS cache
echo "🧹 Limpiando caché de Chrome..."
rm -rf /root/.config/google-chrome 2>/dev/null || true
rm -rf /root/.cache/google-chrome 2>/dev/null || true
rm -rf /root/.config/chromium 2>/dev/null || true
rm -rf /root/.cache/chromium 2>/dev/null || true

# Instalar certificado CA si existe
CA_CERT="${CA_CERT_PATH:-/certs/rootCA.pem}"
if [ -f "$CA_CERT" ]; then
    echo "🔐 Instalando certificado CA de desarrollo..."
    
    # Crear directorio si no existe
    mkdir -p /usr/local/share/ca-certificates
    
    # Copiar el certificado (con extensión .crt)
    cp "$CA_CERT" /usr/local/share/ca-certificates/sushigo-dev-ca.crt
    
    # Actualizar certificados del sistema
    update-ca-certificates
    
    # Crear NSS database para Chrome si no existe
    mkdir -p /root/.pki/nssdb
    if [ ! -f /root/.pki/nssdb/cert9.db ]; then
        certutil -N -d sql:/root/.pki/nssdb --empty-password
    fi
    
    # Importar certificado en Chrome/Chromium
    certutil -d sql:/root/.pki/nssdb -A -t "C,," -n "sushigo-dev-ca" -i "$CA_CERT" 2>/dev/null || true
    
    echo "✅ Certificado CA instalado correctamente"
else
    echo "⚠️  No se encontró certificado CA en $CA_CERT"
fi

echo "🚀 Iniciando servidor X virtual (Xvfb)..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Esperar a que Xvfb esté listo
sleep 2

echo "🪟 Iniciando gestor de ventanas (Fluxbox)..."
fluxbox &
FLUXBOX_PID=$!

echo "📺 Iniciando servidor VNC (x11vnc)..."
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -xkb &
X11VNC_PID=$!

echo "🌐 Iniciando noVNC (puerto 6080)..."
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &
WEBSOCKIFY_PID=$!

echo ""
echo "✅ Servicios iniciados correctamente!"
echo "📱 Accede al navegador en: http://localhost:6080"
echo ""

# Instalar dependencias npm si existe package.json
if [ -f package.json ]; then
    echo "📦 Instalando dependencias de npm..."
    npm install
fi

# Si se pasa un comando, ejecutarlo
if [ $# -gt 0 ]; then
    echo "▶️  Ejecutando comando: $@"
    exec "$@"
else
    echo "⏳ Esperando conexión... (Ctrl+C para detener)"
    # Mantener el contenedor vivo
    tail -f /dev/null
fi

# Cleanup al salir
trap "kill $XVFB_PID $FLUXBOX_PID $X11VNC_PID $WEBSOCKIFY_PID 2>/dev/null" EXIT
