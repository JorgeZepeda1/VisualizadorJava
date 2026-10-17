// Una frase del catálogo es-MX con código entre comillas invertidas (`if`, `total`): la presentación la parte en tramos (`segmentarCodigoEnLinea`) y cada tramo de código se pinta como `<code>`;
// la pantalla nunca muestra las comillas invertidas crudas. Atajo de `TextoConCodigo` para los componentes que reciben la frase como texto.
import { segmentarCodigoEnLinea } from '../../presentacion/index.ts';
import { TextoConCodigo } from './TextoConCodigo.tsx';

export interface PropiedadesFraseConCodigo {
  readonly texto: string;
}

export function FraseConCodigo({ texto }: PropiedadesFraseConCodigo) {
  return <TextoConCodigo segmentos={segmentarCodigoEnLinea(texto)} />;
}
