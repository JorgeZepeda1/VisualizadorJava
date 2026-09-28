// Verificación del selector de `switch` (tarea 1.7, REQ-COMP-002, design.md §2.7). Verificado
// contra javac 17 real (esta sesión, sin `--enable-preview`): CUALQUIER selector fuera de
// {int, char, String} da el mismo mensaje genérico del compilador — "patterns in switch
// statements are a preview feature and are disabled by default" (con `long` específicamente,
// javac AGREGA un segundo error de "constant label... not compatible", pero el primero ya basta
// para rechazar) — no hay un mensaje distinto por tipo. Por eso esta función solo reporta el tipo
// real detectado (`datos.tipo`); el texto en español lo arma la tarea 1.11 sobre ese dato.
import type { NodoSwitch } from '../sintaxis/ast.ts';
import type { Alcance } from './alcance.ts';
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
