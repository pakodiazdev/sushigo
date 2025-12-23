# 🔐 Configuración SSL con mkcert para sushigo.local

Esta guía explica cómo configurar HTTPS local usando certificados autofirmados con mkcert.

## 🚀 Inicio rápido

```bash
# 1. Reconstruir el contenedor (genera certificados automáticamente)
docker compose up -d --build dev

# 2. Ver información de los certificados
make ssl-info

# 3. Configurar /etc/hosts
make hosts-setup

# 4. Instalar el certificado raíz en tu navegador (ver abajo)
```

## 📋 Requisitos

-   Docker y Docker Compose
-   Privilegios de administrador para modificar `/etc/hosts`

## 🔧 Configuración paso a paso

### 1. Generar certificados

Los certificados se generan automáticamente al iniciar el contenedor. Si necesitas regenerarlos:

```bash
# Eliminar certificados existentes
rm -rf docker/app/config/dev/cert/*.pem docker/dev/config/dev/cert/*.crt

# Reconstruir el contenedor
docker compose up -d --build dev
```

### 2. Configurar archivo hosts

Agrega la siguiente línea a tu archivo hosts:

```
127.0.0.1  sushigo.local
```

**Ubicación del archivo:**

-   **Windows**: `C:\Windows\System32\drivers\etc\hosts` (requiere ejecutar Notepad como administrador)
-   **macOS/Linux**: `/etc/hosts` (requiere `sudo`)

**Comandos:**

```bash
# Mac/Linux
sudo nano /etc/hosts

# Windows (PowerShell como administrador)
notepad C:\Windows\System32\drivers\etc\hosts
```

### 3. Instalar el certificado raíz

El archivo `rootCA.pem` se encuentra en: `docker/dev/config/dev/cert/rootCA.pem`

#### Windows

1. **Copiar el certificado:**

    ```powershell
    copy docker\dev\config\dev\cert\rootCA.pem %USERPROFILE%\Desktop\rootCA.crt
    ```

2. **Instalar:**
    - Doble click en `rootCA.crt` en el escritorio
    - Click en "Instalar certificado..."
    - Selecciona "Usuario actual" → Siguiente
    - Selecciona "Colocar todos los certificados en el siguiente almacén"
    - Click en "Examinar" → Selecciona "**Entidades de certificación raíz de confianza**"
    - Finalizar

#### macOS

```bash
# Instalar en el sistema
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain docker/dev/config/dev/cert/rootCA.pem

# O manualmente:
# 1. Abrir "Acceso a Llaveros" (Keychain Access)
# 2. Arrastra rootCA.pem a "Certificados del sistema"
# 3. Doble click en el certificado "mkcert"
# 4. Expandir "Confiar" → Seleccionar "Confiar siempre"
```

#### Linux (Ubuntu/Debian)

```bash
# Copiar el certificado
sudo cp docker/dev/config/dev/cert/rootCA.pem /usr/local/share/ca-certificates/mkcert-rootCA.crt

# Actualizar certificados del sistema
sudo update-ca-certificates

# Para Chrome/Chromium, también necesitas:
mkdir -p $HOME/.pki/nssdb
certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n mkcert -i docker/dev/config/dev/cert/rootCA.pem
```

#### Firefox (todas las plataformas)

Firefox usa su propio almacén de certificados:

1. Abre Firefox y ve a: `about:preferences#privacy`
2. Desplázate hasta "Certificados" → Click en "Ver certificados..."
3. Pestaña "Autoridades" → Click en "Importar..."
4. Selecciona `docker/dev/config/dev/cert/rootCA.pem`
5. Marca "**Confiar en esta CA para identificar sitios web**"
6. Aceptar

## 🌐 Acceso a la aplicación

Después de completar la configuración:

-   **Frontend (HTTPS)**: https://sushigo.local
-   **Frontend (HTTP)**: http://sushigo.local (redirige automáticamente a HTTPS)
-   **Backend API**: http://localhost (acceso directo sin proxy)

## 🔍 Verificación

1. **Abrir en el navegador:** https://sushigo.local
2. **Verificar el candado verde** en la barra de direcciones
3. **Click en el candado** → "El certificado es válido"

## 🛠️ Comandos útiles

```bash
# Ver información de certificados
make ssl-info

# Ver instrucciones de configuración de hosts
make hosts-setup

# Reiniciar Apache después de cambios
docker compose restart dev

# Ver logs de Apache
docker compose logs -f dev
```

## 📝 Estructura de archivos

```
docker/app/config/dev/cert/
├── .gitignore              # Ignora certificados (no commitear claves privadas)
├── README.md               # Documentación de instalación
├── sushigo.local.crt       # Certificado SSL (generado automáticamente)
├── sushigo.local-key.pem   # Clave privada (generado automáticamente)
├── rootCA.pem              # Certificado raíz de CA (instalar en navegador)
└── rootCA-key.pem          # Clave privada de CA (generado automáticamente)
```

## 🔐 Arquitectura del reverse proxy

```
┌─────────────────────────────────────────────────────────┐
│  Navegador: https://sushigo.local                       │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS (443)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Apache (contenedor dev)                                │
│  ├─ VirtualHost *:443 (sushigo.local)                   │
│  │  └─ SSL + Proxy → http://dev:5173                    │
│  │                                                       │
│  └─ VirtualHost *:80 (localhost)                        │
│     └─ Laravel API directo                              │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Vite Dev Server (dev:5173)                             │
│  Frontend React + HMR                                   │
└─────────────────────────────────────────────────────────┘
```

## ⚠️ Notas importantes

1. **Certificados autofirmados**: Solo para desarrollo local
2. **No commitear claves privadas**: Los certificados están en `.gitignore`
3. **Regeneración**: Los certificados se mantienen entre reinicios del contenedor
4. **Renovación**: Si eliminas los certificados, se regeneran automáticamente al iniciar

## 🐛 Troubleshooting

### "Sitio no seguro" o "NET::ERR_CERT_AUTHORITY_INVALID"

-   Verifica que instalaste el certificado raíz (`rootCA.pem`)
-   En Chrome: `chrome://settings/certificates` → Verificar que mkcert está en "Autoridades"
-   Reinicia el navegador después de instalar el certificado

### "No se puede acceder al sitio"

-   Verifica que agregaste `127.0.0.1 sushigo.local` a `/etc/hosts`
-   Prueba con `ping sushigo.local` (debe responder 127.0.0.1)
-   Verifica que el contenedor dev está corriendo: `docker ps`

### Certificados no se generan

```bash
# Ver logs del contenedor
docker compose logs dev | grep -i cert

# Entrar al contenedor y generar manualmente
docker compose exec dev bash
/usr/local/bin/generate-certs.sh
```

### WebSocket (HMR) no funciona

-   Verifica que el módulo `proxy_wstunnel` está habilitado en Apache
-   Los logs de Apache deben mostrar: "AH01144: No protocol handler was valid"

## 📚 Recursos adicionales

-   [mkcert documentation](https://github.com/FiloSottile/mkcert)
-   [Apache mod_proxy](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html)
-   [Vite HMR over HTTPS](https://vitejs.dev/config/server-options.html#server-https)
