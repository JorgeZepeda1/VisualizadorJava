// Tope de las pruebas y de los ganchos (`beforeAll`) de `herramientas/oraculo/**` que lanzan JVM: un lote de javac, una sonda del JDK, la CLI del generador.
//
// Tarea 1.35 (WARNING 1 de la re-verificación del lote 1: «`test:oraculo` falló una vez»): cada prueba traía su tope a mano (120 000, 180 000 o 300 000 ms) y, con la CPU
// saturada, una JVM tarda 5 o 10 veces más: una corrida con 16 procesos ocupados sobre 8 núcleos (carga ≈ 40) hizo que `matriz-de-valores-y-contextos.test.ts` se rindiera con
// «Hook timed out in 120000ms» (3 240 programas compilados en una JVM; solo, tarda unos 19 s). El tope NO existe para medir velocidad sino para no esperar para siempre si una JVM se
// cuelga, y las funciones que lanzan los procesos ya tienen el suyo (`compilarEnLote`: 10 minutos): este es el mismo, en un solo sitio.
export const LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS = 600_000;
