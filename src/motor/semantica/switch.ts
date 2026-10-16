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
import { esAsignable } from './verificaciones-de-tipo.ts';

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
 * Las etiquetas de un `switch`, en el ORDEN en que javac las revisa (`Attr.handleSwitch`), etiqueta por etiqueta:
 *   1. tarea 1.32 (F4, JLS 14.11) su TIPO: cada `case` debe ser ASIGNABLE al del selector (`esAsignable`, con el valor constante para
 *      el estrechamiento `case 65:` con un selector `char`) — `case "x":` con un `int`, `case 1:` con un `String`, `case 70000:` con un
 *      `char` son `prob.found.req` en javac. Solo se mira con un selector válido (int, char, String): uno inválido ya se rechazó él, y
 *      uno «desconocido» no se sabe (D2). Antes que la constancia, como javac: `case t:` con un `String t` no constante es un error de
 *      TIPO, no «constant expression required»;
 *   2. err34 de exploracion/03 («constant expression required»: una etiqueta que NO es una expresión constante — JLS 15.29,
 *      `constantes.ts` de la tarea 1.10);
 *   3. flow05 («duplicate case label»: dos etiquetas constantes con el MISMO valor), reportado en la SEGUNDA aparición, igual que javac.
 * Y tarea 1.32: un segundo `default` («duplicate default label»), también en su segunda aparición. Devuelve TODOS los problemas
 * encontrados, en el ORDEN de las etiquetas (mismo patrón que `atribuir`/`recolectarNoSoportados`).
 */
export function verificarEtiquetasDeCase(nodo: NodoSwitch, alcance: Alcance): ProblemaAtribucion[] {
  const problemas: ProblemaAtribucion[] = [];
  const vistas: ValorConstante[] = [];
  const tipoDelSelector = tipoDeExpresion(nodo.selector, alcance);
  const selectorConocido = TIPOS_DE_SELECTOR_VALIDOS.has(tipoDelSelector);
  let hayDefault = false;
  for (const elemento of nodo.elementos) {
    if (elemento.tipo === 'etiqueta-default') {
      if (hayDefault) problemas.push({ codigo: 'etiqueta-default-duplicada', rango: elemento.rango, datos: {} });
      hayDefault = true;
      continue;
    }
    if (elemento.tipo !== 'etiqueta-case') continue;
    const constante = valorConstante(elemento.valor, alcance);
    const tipoDeLaEtiqueta = tipoDeExpresion(elemento.valor, alcance);
    if (selectorConocido && tipoDeLaEtiqueta !== 'desconocido' && !esAsignable(tipoDeLaEtiqueta, tipoDelSelector, constante)) {
      problemas.push({ codigo: 'etiqueta-de-case-de-otro-tipo', rango: elemento.rango, datos: { etiqueta: tipoDeLaEtiqueta, selector: tipoDelSelector } });
      continue;
    }
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
