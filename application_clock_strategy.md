# 🕒 Application Clock & Time Handling Strategy
## SushiGo Admin

---

## 1. 🎯 Objetivo

Diseñar un sistema consistente y seguro para el manejo de tiempo en la aplicación, que permita:

- Manejo correcto de timezones
- Persistencia consistente en base de datos
- Seguridad contra manipulación del cliente
- Testing manual sin depender del tiempo real
- Sincronización entre frontend y backend

---

## 2. 🧠 Conceptos Clave

### Instante vs Hora Local

- Un **timestamp en UTC** representa un instante absoluto
- La **hora local** depende del timezone

Ejemplo:

UTC:     2026-04-16T18:00:00Z  
UTC-6:   2026-04-16 12:00:00  

✔ Mismo instante  
❌ Distinta hora local

---

## 3. 📦 Reglas Generales del Sistema

### Persistencia (DB)
- Todas las fechas se guardan en **UTC (UTC-0)**

### Backend
- Fuente de verdad del tiempo
- Convierte cualquier fecha recibida a UTC
- Ejecuta toda la lógica de negocio

### Frontend
- Envía fechas con timezone explícito (ISO 8601)
- No es responsable de convertir a UTC
- Convierte fechas a timezone local para visualización

---

## 4. 🔐 Contrato de API

### Formatos válidos

Con UTC:
2026-04-16T18:00:00Z

Con offset:
2026-04-16T12:00:00-06:00

### ❌ No permitido
2026-04-16 12:00:00  (sin timezone)

---

## 5. 🧩 Application Clock

### Objetivo
Permitir simular el tiempo del sistema para pruebas manuales sin afectar el reloj real.

---

## 6. ⚙️ Estados del reloj

### system
Usa hora real del servidor

### simulated
Usa una hora base + tiempo transcurrido

---

## 7. 🗄️ Modelo de datos

Tabla: system_clock_state

- mode (system | simulated)
- base_datetime (UTC)
- started_real_datetime (UTC)
- timezone
- updated_at

---

## 8. 🧮 Cálculo del tiempo

now = base_datetime + (real_now - started_real_datetime)

---

## 9. 🔌 Endpoints

GET /api/devtools/clock  
POST /api/devtools/clock/set  
POST /api/devtools/clock/reset  
POST /api/devtools/clock/shift  

---

## 10. 🖥️ Frontend

### Topbar
- Mostrar hora actual
- Indicar modo (Simulated / Real)

### Debug panel
- Setear hora
- Botones rápidos (+5min, +1h, etc.)
- Reset

---

## 11. 🧪 Testing

Permite simular:

- entradas
- retardos
- comidas
- salidas
- tiempo extra

Sin esperar tiempo real

---

## 12. ⚠️ Seguridad

- Nunca habilitar en producción
- Validar environments permitidos
- Requerir flags explícitos

---

## 13. 🧱 Separación de responsabilidades

Frontend:
- captura
- visualización

Backend:
- validación
- conversión a UTC
- lógica de negocio
- persistencia

---

## 14. 🧾 Timestamps

### Técnicos
- created_at
- updated_at

→ tiempo real

### De negocio
- clock_in_at
- meal_start_at
- clock_out_at

→ Application Clock

---

## 15. 🧠 Conclusión

El sistema implementa un **Application Clock desacoplado del sistema operativo**, permitiendo:

- consistencia
- seguridad
- trazabilidad
- testing eficiente

