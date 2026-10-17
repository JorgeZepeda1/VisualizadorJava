// Franja del búfer del Scanner (tarea 4.7, REQ-VIS-009, design.md §6.4): «Sin leer todavía: ␣30⏎» — lo que todavía no se leyó del texto que llegó, con los espacios (␣) y el salto de línea (⏎) a la
// vista y en un elemento propio, para que se distinga del texto ya consumido. Explica el error clásico de `nextInt()` seguido de `nextLine()`. Presentacional puro: recibe lo pendiente ya derivado.
import type { BuferVista } from '../../presentacion/index.ts';
import { textosPaneles } from '../../textos/es-MX/paneles.ts';

export interface PropiedadesFranjaBufer {
  readonly bufer: BuferVista | null;
}

export function FranjaBufer({ bufer }: PropiedadesFranjaBufer) {
  if (bufer === null) return null;
  return (
    <p data-testid="franja-bufer" className="franja-bufer" title={textosPaneles.consola.bufer.explicacion()}>
      {bufer.visible === '' ? (
        textosPaneles.consola.bufer.nada()
      ) : (
        <>
          {textosPaneles.consola.bufer.pendiente('')}
          <span className="bufer-pendiente">{bufer.visible}</span>
        </>
      )}
    </p>
  );
}
