# ADR 007 — Protocolo del trabajador por mensajes, sin memoria compartida

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §5; `exploracion/05` §4; ADR 005, 006

## Contexto

GitHub Pages no permite enviar COOP/COEP, así que no hay `SharedArrayBuffer` ni `Atomics.wait` sin el truco de `coi-serviceworker`. La interfaz debe responder al teclado en ≤ 100 ms incluso con ciclos desbocados y mostrar el aviso en ≤ 2 s (C10). El programa se detiene para esperar al `Scanner`.

## Decisión

1. **Un trabajador por ejecución**, más uno de repuesto ya cargado para ocultar el arranque; editar o volver a visualizar termina el anterior.
2. Mensajes: UI → trabajador `ejecutar`, `entrada`, `cerrar-entrada`, `detener`; trabajador → UI `compilado`, `pasos` (lotes de ≤ 2 000 pasos o ≤ 16 ms), `espera-entrada`, `fin`, `error-interno`. Todos llevan el `id` de la ejecución.
3. El trabajador llama `avanzar` en rebanadas de ≤ 8 ms y cede el control con `MessageChannel`. Los límites de pasos, caracteres y tiempo son cooperativos, dentro del motor, y terminan con un paso `detenido` con datos.
4. **Perro guardián** en el cliente: si pasan 2 s sin mensajes mientras calcula, `terminate()`, se activa el repuesto y la interfaz conserva los pasos ya recibidos.
5. Clonación estructurada (conserva `BigInt`, `-0` y `NaN`); nada de JSON.

## Alternativas consideradas

- **`SharedArrayBuffer` + `Atomics.wait`:** pausa síncrona elegante, pero exige COOP/COEP y un segundo *service worker* que fuerza recarga.
- **Un trabajador de larga vida con reinicio:** menos arranques, pero estado viejo que limpiar y cancelación menos confiable.
- **Intérprete en el hilo principal:** congela la interfaz.

## Consecuencias

- Positivas: cancelación siempre efectiva; ciclo de vida simple; compatible con Pages sin trucos.
- Negativas: más código de protocolo y el estado «esperando entrada» explícito en la interfaz; un arranque de trabajador por ejecución (oculto por el repuesto).
