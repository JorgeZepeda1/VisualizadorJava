// Límites base del intérprete (tarea 2.18, REQ-EJEC-009 mecanismo, design.md §3.5). Aquí viven las señales con las que la ejecución se detiene
// POR DECISIÓN DEL VISUALIZADOR (no porque Java lance una excepción) y los contadores que las provocan. El director (`ejecucion.ts`) las convierte
// en un paso `detenido` con su causa; el tiempo (15 s) y el perro guardián son del trabajador (lote 3, ADR 007).

/** Un texto creció más que `limiteCaracteres`, o la consola pasó su tope (`s += s` en un ciclo, un `println` sin fin). */
export class LimiteExcedido extends Error {
  readonly causa = 'limite-caracteres' as const;

  constructor() {
    super('límite de caracteres');
    this.name = 'LimiteExcedido';
  }
}

/**
 * Un ciclo dio `limitePasos` vueltas sin producir un solo paso (el único caso es `for (;;)` con el cuerpo vacío: no tiene condición que dé pasos). El director cuenta los pasos que
 * salen; esta señal cubre el ciclo que da vueltas sin emitir ninguno, que de otro modo colgaría la ejecución.
 */
export class LimiteDePasosExcedido extends Error {
  readonly causa = 'limite-pasos' as const;

  constructor() {
    super('límite de pasos');
    this.name = 'LimiteDePasosExcedido';
  }
}

/** La consola cabe cuatro veces lo que una cadena (design.md §3.5: 4 194 304 contra 1 048 576). */
const FACTOR_DE_LA_CONSOLA = 4;

/** Una cadena de más de `limite` unidades es `limite-caracteres`. */
export function comprobarLargoDeCadena(largo: number, limite: number): void {
  if (largo > limite) throw new LimiteExcedido();
}

/** Cuenta lo escrito en la consola (`out`, `err` y eco juntos) y se detiene antes de pasar del tope. */
export class ControlDeConsola {
  private total = 0;
  private readonly tope: number;

  constructor(limiteCaracteres: number) {
    this.tope = limiteCaracteres * FACTOR_DE_LA_CONSOLA;
  }

  sumar(texto: string): void {
    if (this.total + texto.length > this.tope) throw new LimiteExcedido();
    this.total += texto.length;
  }
}
