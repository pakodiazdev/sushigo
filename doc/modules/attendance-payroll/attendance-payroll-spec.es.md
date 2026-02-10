# 📋 Módulo de Asistencia, Puntualidad y Cierre de Nómina  
## SushiGo

**Versión:** 0.8 (narrativa + especificación)  
**Fecha:** 2026-02-09  
**Base:** borrador original del módulo fileciteturn1file0  

---

## 1) Problema que queremos resolver (explicado “para humanos”)

En SushiGo necesitamos un control **claro y justo** de:

- **Quién vino a trabajar**
- **A qué hora llegó** (puntualidad / retardos)
- **Cuándo trabajó días extra**
- **Cuántas horas extra ganó**
- **Qué permisos y vacaciones tuvo**
- **Qué días fueron festivos**

La finalidad es que **al terminar la semana** podamos obtener:

1) **El total a pagar por empleado**  
2) Un **desglose** que explique de dónde salió ese total (sueldo base + bonos + extras − ajustes)  
3) Evidencia operativa (asistencias, retardos, aprobaciones)

Esto es importante porque en operación real:
- Si no hay registro, “se vuelve discusión” (quién sí vino, quién llegó tarde, etc.).
- Si no hay reglas, el sistema se siente injusto o manipulable.
- Si no hay cierre (freeze), los números cambian después y nadie confía.

---

## 2) ¿Cómo funciona en la práctica? (flujo operativo)

### 2.1 Día a día (operación)
1) El **Manager** entra a la vista **“Hoy”**.
2) Registra la **hora de llegada (check-in)** de cada empleado.
3) (Ideal) Al final de la jornada registra la **hora de salida (check-out)**.
   - Si existieron **horas extra**, el Manager debe decidir en ese momento si **se pagan** (autorización manual).
   - Si **no** se autoriza pago, las horas extra quedan como **registro histórico** (no se acumulan como saldo).
4) Si alguien no trabajó o necesita ausentarse parcial:
   - se marca como **descanso**, **permiso**, **vacaciones** o **falta**.
   - Si es **permiso parcial** (llegar tarde, salir temprano o tomar tiempo), se registra el evento indicando si es **con goce** o **sin goce**.
5) Si alguien trabajó un **día adicional negociado**:
   - se registra como **Día Extra**, con su pago acordado.
   - ese día **no** participa en el bono de puntualidad.
6) Si alguien trabajó más tiempo del horario:
   - se registran **horas extra ganadas**, que pueden acumularse o pagarse.

7) Si alguien llega **más de 30 minutos tarde** (entrada o regreso de comida):
   - se descuenta del pago la **cantidad exacta de minutos tarde** (minuto no trabajado = minuto no pagado).


### 2.2 Cierre semanal (SushiGo)
Al final de la semana:
1) El sistema genera el **resumen semanal** por empleado.
2) Se calcula el **total a pagar**.
3) Se hace un **cierre** (snapshot/freeze) para que el periodo quede “congelado”.

> Si hay correcciones después del cierre, deben quedar auditadas y controladas.

---

## 3) Reglas de puntualidad (Bono SushiGo)

La puntualidad se calcula contra la **hora esperada de entrada** del empleado (configurada en su **horario por día**).

- **tardanza = llegada_real - hora_esperada**
- Si tardanza <= 0 → tardanza = 0
- La evaluación se hace en **minutos con precisión de segundos**.
  - Ejemplo: si la hora esperada es 13:00:00, llegar 13:09:59 sigue dentro del primer rango.

### Rangos de bono por tardanza
- **0:00 a 9:59** minutos tarde → **100%**
- **10:00 a 14:59** → **50%**
- **15:00 a 20:59** → **25%**
- **21:00 a 25:59** → **10%**
- **26:00+** → **0%**

### Bono semanal base (SushiGo)
- Grupo $110 (ej. Angela, Adonais, Moni)
- Grupo $100 (resto, excepto Samantha)
- Samantha $50

**Cálculo diario**
- $110 y $100 se dividen entre **6 días laborales**
- $50 se divide entre **3 días laborales**

**Importante**
- Días vacíos (descanso) → **no hay bono**
- **Día extra negociado** → **sí se paga** el día extra, pero **no aplica** para bonos de puntualidad
- Caso especial (ejemplo real): **Andrea** Mar/Mié/Jue = **0%** (configurable por empleado/periodo)

---

## 4) Días extra negociados (cuando “no debería pasar” pero pasa)

Normalmente un empleado trabaja su semana normal (por ejemplo 6 días).  
Si aparece un 7º día, en SushiGo lo consideramos como:

- **Día extra negociado**
- Tiene un **pago acordado** (monto fijo o multiplicador)
- **No cuenta** para el bono de puntualidad
- **No cuenta** para descanso proporcional
- Debe quedar **aprobado** (Manager/Admin) para que no sea ambiguo

Ejemplo: sobrinos en vacaciones que vienen a apoyar.

---

## 5) Banco de horas extra (control de horas extra ganadas)

Además de días extra, a veces se ganan **horas extra** (quedarse más tiempo).  
Necesitamos llevar un banco porque esas horas pueden:

- Pagarse al cierre,
- Acumularse para después,
- Canjearse como tiempo libre,

según se defina (SushiGo) o según configuración (ComandaFlow).

Para que el banco sea confiable, cada movimiento debe registrar:
- fecha, minutos, tipo (ganada/usada/pagada/ajuste), origen (auto/manual) y aprobación si aplica.

---


---

# PARTE B — ESPECIFICACIÓN TÉCNICA (RF / RN / DA)

> Esta sección es la base para implementar backend/frontend, pruebas y reportes.

---

## 7) Roles (SushiGo: roles empatados)

Roles del empleado (operativos y de acceso):
- **Manager**
- **Cocinero**
- **Ayudante de Cocina**
- **Repartidor**

Permiso especial:
- **Admin** (edición histórica, catálogos, overrides)

---

## 8) Glosario

- **Periodo laboral:** intervalo contratado (puede haber reingresos).
- **Periodo de pago (cierre):** intervalo para calcular pago.
- **Horario:** entrada/salida/comida por día.
- **Asistencia:** check-in/out (y opcional comida).
- **Estatus del día:** trabajó/descanso/permiso/vacaciones/festivo/falta/extra.
- **Día extra negociado:** día adicional acordado (no aplica para bonos).
- **Horas extra (banco):** tiempo adicional ganado (y su consumo o pago).

---

## 9) Requerimientos Funcionales (RF)

### 9.1 Empleados y cuenta
- **RF-01:** Registrar empleados (datos generales).
- **RF-02:** Rol: Manager/Cocinero/Ayudante/Repartidor.
- **RF-03:** Sucursal por periodo.
- **RF-04:** Empleado consulta historial (asistencia, bonos, horas extra, vacaciones).

### 9.2 Periodos laborales
- **RF-05:** Registrar múltiples periodos por empleado (reingresos).
- **RF-06:** Solo un periodo activo a la vez.
- **RF-07:** Historial consultable.

### 9.3 Horarios
- **RF-08:** Definir horario por día (entrada, comida, salida, descansos).
- **RF-09:** Versionar horario y asociarlo a periodo laboral.

### 9.4 Jornada
- **RF-10:** Jornada completa (6d/8h) o parcial (variable).

### 9.5 Asistencia
- **RF-11:** Registrar check-in por empleado/fecha.
- **RF-12:** Registrar check-out por empleado/fecha.
- **RF-13:** Calcular minutos tarde vs hora programada.
- **RF-14:** Calcular horas trabajadas netas (descontando comida si aplica).
- **RF-15:** Sugerir estatus preliminar del día.


- **RF-15a:** El sistema debe calcular **minutos de tardanza** para:
  - **Entrada** (check-in vs hora programada)
  - **Regreso de comida** (fin de comida real vs fin de comida programado)
- **RF-15b:** Si la tardanza es **mayor a 30 minutos**, el sistema debe generar automáticamente un **ajuste de pago** por los **minutos no trabajados** (minuto no pagado), sin aplicar sanción adicional.


### 9.6 Estatus del día
- **RF-16:** Cada empleado/fecha debe tener un estatus:
  - normal / descanso / permiso / vacaciones / festivo / falta / extra

### 9.7 Edición, auditoría y cierre
- **RF-17:** Manager edita solo el día en curso.
- **RF-18:** Históricos solo Admin.
- **RF-19:** Auditoría mínima en cambios históricos (quién/cuándo/antes/después).
- **RF-20:** Cierre de periodo (freeze) con snapshot del cálculo.
- **RF-21:** Reapertura/recálculo solo con permisos y auditoría.

### 9.8 Sueldo por periodo
- **RF-22:** Sueldo diario con vigencia (historial de incrementos).
- **RF-23:** El cierre usa el sueldo vigente en el periodo.

### 9.9 Permisos (con goce / sin goce)
- **RF-24:** Catálogo de permisos con:
  - con goce / sin goce
  - tipo de permiso (parcial o por día/rango)
  - si genera descanso proporcional
  - si cuenta para bono (bandera recomendada)
- **RF-25:** Registrar permisos por fecha o rango.
- **RF-25a (Permiso parcial):** Registrar permisos parciales por empleado/fecha con:
  - tipo: **llegar tarde** | **salir temprano** | **tomar tiempo**
  - ventana de tiempo (inicio/fin) o duración en minutos
  - **con goce** o **sin goce**
  - motivo y aprobado_por
- **RF-25b (Cálculo sin goce):** Si el permiso es **sin goce**, se debe descontar del pago **exactamente** el tiempo tomado **minuto a minuto** (nunca más, nunca menos).
- **RF-25c (Cálculo con goce):** Si el permiso es **con goce**, solo queda el registro histórico del evento y **no afecta** la nómina.

### 9.10 Vacaciones
- **RF-26:** Gestionar saldo conforme LFT (MX).
- **RF-27:** Solicitud y aprobación.
- **RF-28:** Bloquear captura normal en vacaciones aprobadas (salvo override Admin).

### 9.11 Festivos
- **RF-29:** Catálogo de festivos .
- **RF-30:** Multiplicador normal/doble/triple.
- **RF-31:** Determinar pago según estatus (laborado/no laborado).

### 9.12 Puntualidad, retardos y bonos
- **RF-32:** Configurar rangos de puntualidad → porcentaje.
- **RF-33:** Configurar bono semanal base por empleado/grupo.
- **RF-34:** Prorratear bono semanal a bono diario por días laborales.
- **RF-35:** Excluir descansos (celdas vacías) del bono.
- **RF-36:** Calcular horas libres por semanas puntuales (beneficio).
- **RF-37:** Soportar excepciones por empleado/periodo (ej. Andrea Mar/Mié/Jue = 0%).

### 9.13 Días extra negociados
- **RF-38:** Registrar un día como **Extra** para empleado/fecha.
- **RF-39:** Extra guarda: empleado, fecha, sucursal, pago acordado, aprobación, notas.
- **RF-40:** Extra no aplica para bono puntualidad ni horas libres.
- **RF-41:** El cierre suma el pago del día extra al total.

### 9.14 Banco de horas extra
- **RF-42:** Acumular horas extra ganadas por empleado.
- **RF-43:** Generación por:
  - (a) automático: horas trabajadas > horas programadas
  - (b) manual autorizado
- **RF-44:** Movimientos: GANADA | USADA | PAGADA | AJUSTE
- **RF-45:** Cada movimiento registra: fecha, minutos, origen, referencia, aprobación, motivo.
- **RF-46:** Mostrar saldo e historial.
- **RF-47:** En el cierre, las horas extra **solo se pagan** si fueron **autorizadas** por el Manager; si no, quedan como **histórico**.

- **RF-47a (Autorización de pago):** El pago de horas extra debe requerir **autorización explícita del Manager**. La autorización ocurre al **registrar la salida (check-out)** o al confirmar el cierre del día.
- **RF-47b (Registro de pago):** Cuando una hora extra sea pagada, el sistema debe registrar:
  - método de valuación usado (LFT/proporcional o pago acordado por hora)
  - tarifa aplicada (monto por hora y/o factor)
  - monto resultante
  - quién autorizó y cuándo
  - referencia a los registros de asistencia del día
- **RF-47c (Configuración por empleado):** Cada empleado debe tener una configuración vigente de **cómo se paga la hora extra**:
  - (a) **Proporcional al sueldo** conforme a LFT (según reglas configurables de la empresa), o
  - (b) **Pago acordado por hora** (tarifa fija acordada)
  Esta configuración debe tener **histórico por vigencia** (inicio/fin) para trazabilidad.


### 9.15 Reportes
- **RF-48:** Vista “Hoy”.
- **RF-49:** Resumen del periodo por empleado (desglose completo).
- **RF-50:** Exportables (CSV/PDF) del cierre + auditoría.

---

## 10) Reglas de Negocio (RN)


### 10.1a Descuento por tardanza (> 30 min) (SushiGo)
- **RN-00:** Si la tardanza (entrada o regreso de comida) es **> 30 minutos**, se descuenta del pago la **cantidad exacta de minutos tarde** (*minuto no trabajado = minuto no pagado*).
- **RN-00b:** No existe sanción adicional por esa tardanza, más allá de:
  - el **descuento por minutos no trabajados**, y
  - la posible afectación en **bono de puntualidad** (si aplica por tu esquema).

### 10.1b Permisos parciales (con goce / sin goce)
- **RN-00c:** Todo permiso (llegar tarde, salir temprano o tomar tiempo) debe registrarse y quedar aprobado.
- **RN-00d (Sin goce):** Si el permiso es **sin goce**, se descuenta del pago el **tiempo exacto** tomado **minuto a minuto**.
- **RN-00e (Con goce):** Si el permiso es **con goce**, no hay descuento; solo queda el **registro histórico**.

### 10.1 Puntualidad (SushiGo)
- **RN-01:** Rangos por **tardanza** (0–9:59 = 100%, 10–14:59 = 50%, 15–20:59 = 25%, 21–25:59 = 10%, 26:00+ = 0%), calculados contra la **hora esperada** del horario del empleado.
- **RN-02:** Bono semanal prorrateado:
  - $110/$100 ÷ 6; $50 ÷ 3.
- **RN-03:** Descanso → sin bono.
- **RN-04:** Extra → sin bono.

### 10.2 Horas libres por puntualidad (SushiGo)
- **RN-05:** 6 puntuales → 1h fin de semana
- **RN-06:** 5 puntuales → 1h entre semana
- **RN-07:** 4 puntuales → 0.5h entre semana
- **RN-08:** Validación: puntualidad en los 2 últimos días del periodo

### 10.3 Días extra negociados
- **RN-09:** Extra requiere aprobación.
- **RN-10:** Pago de extra por acuerdo (monto fijo o multiplicador).

### 10.4 Banco de horas extra
- **RN-11:** Las horas extra **solo se pagan** si el **Manager las autoriza** al registrar la salida o validar el día. Si no se autorizan, quedan como **registro histórico**.
- **RN-11b (Valuación):** Al pagar horas extra, el sistema aplica el método configurado para el empleado (LFT/proporcional o tarifa acordada) y guarda el histórico del pago.
  - **Proporcional al sueldo** siguiendo criterios LFT (configurables por empresa), o
  - **Tarifa acordada por hora**.
  El método y tarifa aplicados deben guardarse en el **histórico del pago**.
- **RN-12:** Cada movimiento ajusta el saldo y es auditable.

### 10.5 Descanso proporcional (borrador original)
- **RN-13 (Completa – por día):** 1/6 de día de descanso por día trabajado.
- **RN-14 (Completa – por hora):** 1/48 de día de descanso por hora trabajada.
- **RN-15 (Parcial):** proporcional por hora.

### 10.6 Cierre
- **RN-16:** El cierre guarda snapshot del cálculo.
- **RN-17:** Cambios post-cierre requieren reapertura/recálculo con auditoría.

---

## 11) Definiciones cerradas (antes DA)

- **DC-01 (Horas extra):** El pago de horas extra **requiere autorización**. El **Manager** debe marcar manualmente si **se paga** al registrar la **salida (check-out)**. Si no se autoriza, la hora extra queda como **histórico** (no se acumula como saldo).
- **DC-02 (Día extra negociado):** Un día marcado como **Extra** **no cuenta** para **descanso proporcional** y **no aplica** para bono puntualidad.
- **DC-03 (Valuación de hora extra):** La hora extra puede valuarse de dos formas, configurables **por empleado** y con **histórico**:
  1) **Proporcional al sueldo**, siguiendo criterios de la **LFT** (reglas configurables por empresa).
  2) **Pago acordado por hora** (tarifa fija).
  Al pagar, el sistema debe guardar el **método**, la **tarifa** y el **monto** aplicado para auditoría/histórico.




---

## 12) Anexos (pendientes)
- Ejemplo real de cálculo semanal (tabla) + resultados
- Plantilla de configuración SaaS (JSON/YAML)
- Diagrama de dominio (Mermaid)
