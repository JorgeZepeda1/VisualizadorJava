// Regla 5 de CLAUDE.md y decisión D2: lo que Java SÍ hace pero la biblioteca no tiene caracterizado al 100 % contra el JDK real NO se calcula "más o menos": se detiene la ejecución con
// el aviso «No disponible en el visualizador». La biblioteca lanza esta clase y el intérprete la convierte en el paso final `detenido` con ese aviso (la traza previa sigue navegable).
// El `motivo` es un código estable para que `src/textos/es-MX` ponga la explicación en español (ADR 015); nunca se muestra tal cual.

export type MotivoNoDisponible =
  /** `Double.parseDouble("0x1p3")`: literal de coma flotante hexadecimal. */
  | 'double-hexadecimal'
  /** `printf`/`String.format` con una conversión, bandera o argumento válidos en Java pero fuera del alcance (`%e`, `%x`, `%+d`…). */
  | 'formato-fuera-de-alcance'
  /** `Math.pow` sin el puerto de fdlibm verificado contra el oráculo (ADR 009). */
  | 'math-pow'
  /** `toUpperCase`/`toLowerCase` con texto que sale del plano básico multilingüe, donde `Character` de un solo `char` no basta. */
  | 'mayusculas-fuera-del-plano-basico';

export class NoDisponibleEnEjecucion extends Error {
  readonly motivo: MotivoNoDisponible;

  constructor(motivo: MotivoNoDisponible, detalle = '') {
    super(`No disponible en el visualizador (${motivo})${detalle === '' ? '' : `: ${detalle}`}`);
    this.name = 'NoDisponibleEnEjecucion';
    this.motivo = motivo;
  }
}
