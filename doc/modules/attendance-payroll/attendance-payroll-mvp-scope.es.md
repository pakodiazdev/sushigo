# ✅ Alcance del MVP — Attendance & Payroll (SushiGo)

**Objetivo del MVP:**  
Al finalizar la semana, el sistema debe generar el **total a pagar por empleado** con un **desglose claro y auditable**, considerando asistencia, retardos, **permisos (con/sin goce)**, descuento por tardanza >30 min, bonos de puntualidad, días extra negociados y horas extra (solo si fueron autorizadas para pago).

---

## 1) Entregable principal

Al cierre del periodo (semana), el sistema debe producir:

- **Total a pagar por empleado**
- **Desglose** por conceptos:
  - Sueldo base del periodo
  - Descuentos por minutos no trabajados (>30 min tarde) y por **permisos sin goce**
  - Pago de horas extra autorizadas (si aplica)
  - Pago por día extra negociado (si aplica)
  - Bono de puntualidad (si aplica)
- **Evidencia** por día (tabla):
  - check-in, check-out
  - tiempos de comida (al menos regreso)
  - estatus del día
  - minutos tarde y minutos descontados
  - permisos del día (tipo, con/sin goce, minutos)
  - si hubo horas extra y si se pagaron
- **Snapshot/Cierre**: el cálculo queda congelado y consultable.

---

## 2) Funcionalidad incluida (MVP)

### 2.1 Empleados
- Alta y edición básica de empleados.
- Asignación de rol (Manager/Cocinero/Ayudante/Repartidor).
- Activar/desactivar empleado.

### 2.2 Horario (base para puntualidad)
- Configuración de horario por empleado y por día de la semana, mínimo:
  - **Hora esperada de entrada**
  - **Hora esperada de regreso de comida** (o fin de comida programado)
  - Hora esperada de salida (ideal, para horas extra)
  - Días de descanso
- Horario vigente consultable.

### 2.3 Registro diario de asistencia
- Vista “Hoy” (operación):
  - Lista de empleados
  - Captura rápida de **check-in**
- Captura de **regreso de comida** (mínimo) para aplicar reglas.
- Captura de **check-out** para cerrar el día y calcular horas extra.
- Edición:
  - Manager solo edita el día en curso.
  - Históricos solo Admin (con auditoría).

### 2.4 Permisos parciales (con goce / sin goce)
Registrar permisos cuando el empleado:
- **llega tarde** (por permiso),
- **sale temprano**, o
- **toma tiempo** durante la jornada.

En cada permiso se debe indicar:
- **con goce** o **sin goce**
- ventana (inicio/fin) o duración en minutos
- motivo y aprobado_por

Reglas:
- **Sin goce:** se descuenta **minuto a minuto** el tiempo exacto tomado (nunca más, nunca menos).
- **Con goce:** no afecta nómina, solo queda registro histórico.

### 2.5 Estatus del día
- Por empleado/fecha, registrar o inferir estatus:
  - Normal (trabajó)
  - Descanso
  - Falta
  - Extra negociado

### 2.6 Regla de tardanza (>30 min) — entrada y regreso de comida
- Si el empleado llega **más de 30 minutos tarde**:
  - se descuenta del pago la **cantidad exacta** de minutos tarde.
  - **minuto no trabajado = minuto no pagado**
- Aplica a:
  - Hora de entrada (check-in vs hora esperada)
  - Regreso de comida (regreso real vs hora esperada)

### 2.7 Bono de puntualidad — basado en “N minutos tarde”
La puntualidad se calcula contra la **hora esperada** del horario del empleado.

Rangos por tardanza (con precisión de segundos):
- **0:00 a 9:59** → **100%**
- **10:00 a 14:59** → **50%**
- **15:00 a 20:59** → **25%**
- **21:00 a 25:59** → **10%**
- **26:00+** → **0%**

Bono semanal base y prorrateo:
- $110/$100 ÷ 6 días laborales
- $50 ÷ 3 días laborales

No aplica en:
- descansos
- faltas
- **día extra negociado**

Excepción MVP:
- permitir forzar 0% por empleado/días (ej. Andrea Mar/Mié/Jue)

### 2.8 Día extra negociado (sin bono)
- Registrar un día como “Extra negociado”:
  - fecha
  - empleado
  - pago acordado
  - aprobado por Manager/Admin
- Ese día:
  - **sí se paga**
  - **no aplica** para bono de puntualidad
  - **no cuenta** para descanso proporcional

### 2.9 Horas extra (solo pago si hay autorización)
- Al registrar el **check-out**, el Manager debe indicar:
  - “Se paga hora extra: Sí/No”
- Si **Sí**:
  - se registra pago con método:
    - proporcional al sueldo (LFT) o tarifa acordada (config del empleado)
  - se guarda histórico: método, tarifa, monto, quién autorizó y cuándo
- Si **No**:
  - queda como **registro histórico** (no saldo acumulable)

### 2.10 Cierre semanal (snapshot)
- Vista de cierre semanal:
  - preview del total por empleado
  - desglose
- Botón “Cerrar semana”:
  - genera snapshot y congela resultados
  - bloquea edición (salvo Admin con auditoría)

---

## 3) Reportes del MVP (mínimos)
- **Hoy**: lista de empleados y su estado (llegó/no llegó/tarde).
- **Resumen semanal por empleado**:
  - total a pagar
  - desglose
  - tabla por día (evidencia)
