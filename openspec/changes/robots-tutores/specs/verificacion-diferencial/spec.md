# Delta para Verificación diferencial

> Base: `openspec/changes/visualizador-java/specs/verificacion-diferencial/spec.md` (aún sin archivar). Se aplica después de archivar `visualizador-java`.

## ADDED Requirements

### Requirement: [REQ-DIFF-009] Corpus de los robots verificado contra el JDK
Las muestras de trampas (positivas y casi-trampas), los programas que respaldan las reglas de Java que cita el catálogo de distractores del reto y los ejemplos del libro MUST estar compilados y ejecutados por el oráculo (JDK 17.0.18), con goldens generados por él y nunca escritos a mano; cada muestra o ejemplo MUST coincidir byte a byte con su golden en `npm test`, o —si enseña un error de compilación— en veredicto y línea. La integración continua MUST regenerarlos y compararlos en el trabajo del oráculo, como el resto del corpus.

#### Scenario: una muestra de trampa
- GIVEN `corpus/experimentos/trampas/` con una muestra de `nextInt()` seguido de `nextLine()` y su entrada
- WHEN corre `npm test`
- THEN la salida del motor es idéntica al golden que generó el JDK, y el golden registra que javac la compiló

#### Scenario: la regla de un distractor
- GIVEN la regla «con `||`, si el primer lado es false, Java revisa el segundo» que cita el catálogo del reto
- WHEN se busca su respaldo
- THEN existe un programa en `corpus/experimentos/reto/` cuyo golden del oráculo lo demuestra (imprime algo solo si el segundo lado se evaluó) y el motor coincide con él
