// Consola mínima (design.md §1.2, §6.4). Presentacional puro: recibe los segmentos ya resueltos
// por el contenedor y los concatena en orden dentro de un único <pre>. El color/ícono de `err`, la
// franja del búfer y que el eco se distinga sin depender del color (WCAG, C18) llegan en el lote 5
// (M18) — esta rebanada vertical solo produce segmentos `out`.
import type { Segmento } from '../../motor/vista.ts';

export interface PropiedadesConsola {
  readonly segmentos: readonly Segmento[];
}

export function Consola({ segmentos }: PropiedadesConsola) {
  return (
    <pre data-testid="consola">
      {segmentos.map((segmento, indice) => (
        // El índice basta como key: los segmentos de una consola no se reordenan, solo se
        // acumulan (design.md §3.4 "índice acumulado por paso").
        <span key={indice} data-flujo={segmento.flujo}>
          {segmento.texto}
        </span>
      ))}
    </pre>
  );
}
