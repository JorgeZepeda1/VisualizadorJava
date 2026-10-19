// Aviso de un problema (tarea 4.5, REQ-VIS-002): cada uno de los cuatro tipos —Error de compilación, No disponible en el visualizador, El programa se detuvo por un error, Se detuvo por seguridad—
// lleva un ícono y un título propios, así el alumno los distingue sin depender del color; además dice «y N más» cuando el motor encontró más avisos. Presentacional puro: el texto del problema llega
// armado por la presentación (con su línea) como `children`; el subrayado sobre el código vive en el editor. Por omisión es una región `alert` (asertiva): el lector de pantalla la anuncia al
// aparecer, sin mover el foco. Dentro de una región viva que ya la anuncia (el globo del robot) se pasa `anunciar={false}` para que no se lea dos veces.
import type { ReactNode } from 'react';
import { textosPaneles, type TipoDeAviso } from '../../textos/es-MX/paneles.ts';

/** Un ícono distinto por tipo: decorativo (`aria-hidden`), el título dice lo mismo con palabras. */
const ICONOS: Readonly<Record<TipoDeAviso, string>> = {
  'error-compilacion': '✖',
  'no-disponible': 'ⓘ',
  excepcion: '⚠',
  seguridad: '⛔',
  interno: '⚙',
};

export interface PropiedadesAvisoProblema {
  readonly tipo: TipoDeAviso;
  readonly children: ReactNode;
  /** Cuántos avisos más encontró el motor además del que se muestra (REQ-SUB-006). */
  readonly adicionales?: number;
  readonly anunciar?: boolean;
  /** El nombre del robot que empieza a hablar, solo si cambió el hablante (REQ-PANT-009): se dice ANTES del título, solo para lectores de pantalla. */
  readonly nombreDelRobot?: string | null;
}

export function AvisoProblema({ tipo, children, adicionales = 0, anunciar = true, nombreDelRobot = null }: PropiedadesAvisoProblema) {
  return (
    <div className="aviso" data-tipo={tipo} role={anunciar ? 'alert' : undefined}>
      {nombreDelRobot !== null && <span className="solo-lectores">{`${nombreDelRobot}: `}</span>}
      <p className="aviso-titulo">
        <span data-icono aria-hidden="true">
          {ICONOS[tipo]}
        </span>{' '}
        <strong>{textosPaneles.avisos.titulo(tipo)}</strong>
      </p>
      <p className="aviso-cuerpo">{children}</p>
      {adicionales > 0 && <p className="aviso-mas">{textosPaneles.avisos.masAvisos(adicionales)}</p>}
    </div>
  );
}
