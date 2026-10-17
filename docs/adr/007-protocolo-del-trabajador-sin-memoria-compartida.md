# ADR 007 — Protocolo del trabajador por mensajes, sin memoria compartida

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §5; `exploracion/05` §4; ADR 005, 006

## Contexto

GitHub Pages no permite enviar COOP/COEP, así que no hay `SharedArrayBuffer` ni `Atomics.wait` sin el truco de `coi-serviceworker`. La interfaz debe responder al teclado en ≤ 100 ms incluso con ciclos desbocados y mostrar el aviso en ≤ 2 s (C10). El programa se detiene para esperar al `Scanner`.

## Decisión

1. **Un trabajador por ejecución**, más uno de repuesto ya cargado para ocultar el arranque; editar o volver a visualizar termina el anterior.
2. Mensajes: UI → trabajador `ejecutar`, `entrada`, `cerrar-entrada`, `detener`; trabajador → UI `compilado`, `pasos` (lotes de ≤ 2 000 pasos o ≤ 16 ms), `espera-entrada`, `fin`, `error-interno` y **`detenido`** (el acuse de `detener`, agregado en el hito 2, parte A). Todos llevan el `id` de la ejecución.
3. El trabajador llama `avanzar` en rebanadas de ≤ 8 ms y cede el control con `MessageChannel`. Los límites de pasos, caracteres y tiempo son cooperativos, dentro del motor, y terminan con un paso `detenido` con datos.
4. **Perro guardián** en el cliente: si pasan 2 s sin mensajes mientras calcula, `terminate()`, se activa el repuesto y la interfaz conserva los pasos ya recibidos. Lo mismo para `detener`: el trabajador responde `detenido`; si no llega en 300 ms, el cliente lo termina y **fabrica él mismo** el `detenido`, así que quien pide `detener` recibe siempre exactamente un acuse y la interfaz no necesita su propio plazo.
5. Clonación estructurada (conserva `BigInt`, `-0` y `NaN`); nada de JSON.

## Alternativas consideradas

- **`SharedArrayBuffer` + `Atomics.wait`:** pausa síncrona elegante, pero exige COOP/COEP y un segundo *service worker* que fuerza recarga.
- **Un trabajador de larga vida con reinicio:** menos arranques, pero estado viejo que limpiar y cancelación menos confiable.
- **Intérprete en el hilo principal:** congela la interfaz.

## Consecuencias

- Positivas: cancelación siempre efectiva; ciclo de vida simple; compatible con Pages sin trucos.
- Negativas: más código de protocolo y el estado «esperando entrada» explícito en la interfaz; un arranque de trabajador por ejecución (oculto por el repuesto).

## Enmienda (hito 2, parte A y C): el mensaje `detenido` y lo que hace la pantalla con él

- **Protocolo:** `detenido` (trabajador → UI, `id`) es el acuse de `detener`. El trabajador lo manda aunque la ejecución ya no existiera. Con el acuse, el perro guardián de 300 ms (punto 4) se descansa.
- **Pantalla:** el estado de la ejecución gana `detenida` (junto a `calculando`, `esperando-entrada` y `terminada`). Si la ejecución vigente seguía calculando o esperando un dato, el acuse la deja `detenida`: sin `fin` que resumir, sin pasos por llegar, sin campo de entrada en la consola, con lo ya calculado navegable y el robot diciéndolo. Si ya había terminado, el acuse no cambia nada.
- **Mensajes viejos:** el contenedor descarta todo mensaje cuyo `id` no sea el de la ejecución **vigente**. Antes comparaba contra el `id` que el propio cliente emisor capturó al crearse —que siempre coincidía con el del mensaje—, de modo que la guarda no ignoraba nada; la hallaron las pruebas de `detenido` del hito 2, parte C. «Editar programa» también invalida la ejecución que se deja.
- **Pendiente de producto:** la interfaz todavía no ofrece un botón «Detener» al alumno; hoy editar o volver a visualizar usa `terminar()` del cliente, que no espera acuse.
