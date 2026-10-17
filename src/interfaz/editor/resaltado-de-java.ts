// Los colores del resaltado de sintaxis de Java (tareas 4.3 y 4.15, REQ-VIS-001, design.md §6.6). El estilo por omisión de CodeMirror se pensó para fondo blanco y no alcanza el contraste AA sobre
// las líneas teñidas (la «recién ejecutada» y la «siguiente»); estos colores son más oscuros y se prueban contra TODOS los fondos del editor (`resaltado-de-java.test.ts`). El resaltado solo ayuda a
// leer: el análisis del programa es del motor (`lang-java` únicamente resalta). Nada depende del color solo: una palabra reservada también es otra palabra, un texto lleva comillas.
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { tags } from '@lezer/highlight';

export const COLORES_DE_SINTAXIS = {
  palabraReservada: '#5b0f8a',
  texto: '#8a0b1c',
  numero: '#0b4f8a',
  comentario: '#6a3d00',
  tipo: '#0a5a33',
  definicion: '#0b3d91',
} as const;

const estilo = HighlightStyle.define([
  {
    tag: [tags.keyword, tags.modifier, tags.controlKeyword, tags.definitionKeyword, tags.moduleKeyword, tags.operatorKeyword, tags.self],
    color: COLORES_DE_SINTAXIS.palabraReservada,
  },
  { tag: [tags.string, tags.character, tags.special(tags.string), tags.escape], color: COLORES_DE_SINTAXIS.texto },
  { tag: [tags.number, tags.integer, tags.float, tags.bool, tags.null, tags.atom], color: COLORES_DE_SINTAXIS.numero },
  { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], color: COLORES_DE_SINTAXIS.comentario, fontStyle: 'italic' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: COLORES_DE_SINTAXIS.tipo },
  {
    tag: [tags.definition(tags.variableName), tags.definition(tags.propertyName), tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: COLORES_DE_SINTAXIS.definicion,
  },
]);

export const resaltadoDeJava: Extension = syntaxHighlighting(estilo);
