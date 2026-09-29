// Verificación del selector de `switch` (tarea 1.7, REQ-COMP-002, design.md §2.7). Verificado
// contra javac 17 real (esta sesión, sin `--enable-preview`): CUALQUIER selector fuera de
// {int, char, String} da el mismo mensaje genérico del compilador — "patterns in switch
// statements are a preview feature and are disabled by default" (con `long` específicamente,
// javac AGREGA un segundo error de "constant label... not compatible", pero el primero ya basta
// para rechazar) — no hay un mensaje distinto por tipo. Por eso esta función solo reporta el tipo
// real detectado (`datos.tipo`); el texto en español lo arma la tarea 1.11 sobre ese dato.
import type { NodoSwitch } from '../sintaxis/ast.ts';
import type { Alcance } from './alcance.ts';
import { valorConstante, type ValorConstante } from './constantes.ts';
import type { ProblemaAtribucion } from './diagnostico.ts';
import { type Tipo, tipoDeExpresion } from './tipos.ts';

const TIPOS_DE_SELECTOR_VALIDOS: ReadonlySet<Tipo> = new Set(['int', 'char', 'String']);

/** `null` si el selector es válido (int/char/String) o si su tipo no se pudo determinar todavía
 * ('desconocido' — D2: nunca se inventa un problema sobre algo que no se sabe con certeza; ese
 * caso ya lo cubre, por separado, la resolución de símbolos de `atribucion.ts`). */
export function verificarSelectorDeSwitch(nodo: NodoSwitch, alcance: Alcance): ProblemaAtribucion | null {
  const tipo = tipoDeExpresion(nodo.selector, alcance);
  if (tipo === 'desconocido' || TIPOS_DE_SELECTOR_VALIDOS.has(tipo)) return null;
  return { codigo: 'selector-de-switch-invalido', rango: nodo.rango, datos: { tipo } };
}

/** `char`/`int` se comparan por su valor NUMÉRICO (design.md §2.7: "duplicados por valor tras
 * convertir" — `case 97:` y `case 'a':` en un mismo `switch` de `int` SON el mismo caso); `String`
 * por su contenido. Cualquier otra combinación (tipos distintos no numéricos, p. ej.) nunca es
 * "el mismo valor" en este subconjunto. */
function mismoValorDeEtiqueta(a: ValorConstante, b: ValorConstante): boolean {
  const numeroDe = (v: ValorConstante): number | null => (v.tipo === 'int' || v.tipo === 'char' ? v.valor : null);
  const na = numeroDe(a);
  const nb = numeroDe(b);
  if (na !== null && nb !== null) return na === nb;
  return a.tipo === 'String' && b.tipo === 'String' && a.valor === b.valor;
}

/**
 * err34 de exploracion/03 ("constant expression required": una etiqueta de `case` que NO es una
 * expresión constante — JLS 15.29, `constantes.ts` de la tarea 1.10) y flow05 ("duplicate case
 * label": dos etiquetas constantes con el MISMO valor en el mismo `switch`). Devuelve TODOS los
 * problemas encontrados, en el ORDEN de las etiquetas (mismo patrón que `atribuir`/
 * `recolectarNoSoportados`) — un duplicado se reporta en su SEGUNDA aparición, igual que javac.
 */
export function verificarEtiquetasDeCase(nodo: NodoSwitch, alcance: Alcance): ProblemaAtribucion[] {
  const problemas: ProblemaAtribucion[] = [];
  const vistas: ValorConstante[] = [];
  for (const elemento of nodo.elementos) {
    if (elemento.tipo !== 'etiqueta-case') continue;
    const constante = valorConstante(elemento.valor, alcance);
    if (constante === null) {
      problemas.push({ codigo: 'etiqueta-de-case-no-constante', rango: elemento.rango, datos: {} });
      continue;
    }
    if (vistas.some((v) => mismoValorDeEtiqueta(v, constante))) {
      problemas.push({ codigo: 'etiqueta-de-case-duplicada', rango: elemento.rango, datos: {} });
    }
    vistas.push(constante);
  }
  return problemas;
}
