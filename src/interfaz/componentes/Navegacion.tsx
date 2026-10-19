// La navegación fija «Paso a paso · Libro · Ejemplos» (tarea R0.8, REQ-PANT-002, PQ-2, ADR 017): la sección actual lleva `aria-current="page"` y, en la hoja de estilos, un estilo que no depende solo del color
// (negrita y subrayado grueso). «Libro» aparece solo cuando hay al menos un tema publicado. Cambiar de sección es avisar: el contenedor no destruye el editor ni toca la traza (REQ-PANT-002). Presentacional puro.
import type { Seccion } from '../../presentacion/index.ts';
import { textosPantalla } from '../../textos/es-MX/pantalla.ts';

const NOMBRE_DE_LA_SECCION: Readonly<Record<Seccion, () => string>> = {
  'paso-a-paso': textosPantalla.navegacion.pasoAPaso,
  libro: textosPantalla.navegacion.libro,
  ejemplos: textosPantalla.navegacion.ejemplos,
};

export interface PropiedadesNavegacion {
  readonly seccionActual: Seccion;
  /** ¿Hay al menos un tema del libro publicado? Sin él, la sección «Libro» no aparece (no lleva a un callejón). */
  readonly hayTemasPublicados: boolean;
  readonly alIr: (seccion: Seccion) => void;
}

export function Navegacion({ seccionActual, hayTemasPublicados, alIr }: PropiedadesNavegacion) {
  const secciones: readonly Seccion[] = hayTemasPublicados ? ['paso-a-paso', 'libro', 'ejemplos'] : ['paso-a-paso', 'ejemplos'];
  return (
    <nav className="navegacion" aria-label={textosPantalla.navegacion.etiqueta()}>
      <ul>
        {secciones.map((seccion) => (
          <li key={seccion}>
            <button type="button" data-seccion={seccion} aria-current={seccion === seccionActual ? 'page' : undefined} onClick={() => alIr(seccion)}>
              {NOMBRE_DE_LA_SECCION[seccion]()}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
