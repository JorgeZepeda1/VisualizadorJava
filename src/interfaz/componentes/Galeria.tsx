// La galería «Ejemplos» (tarea R0.11, REQ-AULA-001, ADR 017): los programas del curso por unidad (U3 a U7) y, primero, el ejercicio del PO en «Para empezar». Cada programa lleva su título, su origen marcado
// (del curso o ejercicio del profesor), UNA línea de «Qué observar» y su acción «Ver paso a paso»: con los datos de ejemplo que usó el oráculo si el programa lee del teclado, y «Con mis datos» para
// escribirlos uno mismo; la máquina de snacks ofrece cinco datos de ejemplo, cada uno con lo que pasa. Presentacional puro: recibe la galería ya armada (`null` mientras carga) y avisa qué se abrió y con
// qué entrada. Cuando la lista aparece, la PRIMERA acción recibe el foco: con el teclado, de la puerta del saludo a un ejemplo en una sola acción más.
import { useEffect, useRef } from 'react';
import { etiquetaDeLaEntrada, type GaleriaVista, type ProgramaDeGaleria } from '../../presentacion/index.ts';
import { textosGaleria } from '../../textos/es-MX/galeria.ts';
import { FraseConCodigo } from './FraseConCodigo.tsx';

export interface PropiedadesGaleria {
  /** La galería armada, o `null` mientras se carga (o si no se pudo cargar). */
  readonly galeria: GaleriaVista | null;
  /** El fragmento con los programas no se pudo cargar. */
  readonly fallo?: boolean;
  /** Abre el programa en «Paso a paso» con esa entrada preparada (`''` si el alumno escribe sus propios datos). */
  readonly alAbrir: (programa: ProgramaDeGaleria, entradaPreparada: string) => void;
}

function Programa({ programa, alAbrir }: { readonly programa: ProgramaDeGaleria; readonly alAbrir: PropiedadesGaleria['alAbrir'] }) {
  const { titulo, muestras, entradaPreparada } = programa;
  const pideDatos = entradaPreparada !== '';
  return (
    <li className="programa-de-galeria" data-programa={programa.id}>
      <h4>{titulo}</h4>
      <p className="programa-origen">{textosGaleria.origen(programa.origen)}</p>
      <p className="programa-que-observar">
        <strong>{textosGaleria.queObservar()}</strong>
        {': '}
        <FraseConCodigo texto={programa.queObservar} />
      </p>
      {muestras.length > 0 ? (
        <div className="muestras" role="group" aria-label={textosGaleria.datosDeEjemplo(titulo)}>
          {muestras.map((muestra, indice) => (
            <button key={muestra.etiqueta} type="button" className={indice === 0 ? 'boton-principal' : undefined} onClick={() => alAbrir(programa, muestra.entradaPreparada)}>
              <span className="muestra-etiqueta">{muestra.etiqueta}</span>
              <span className="muestra-descripcion">{muestra.descripcion}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {pideDatos && <p className="programa-datos">{textosGaleria.datosDeEjemplo(etiquetaDeLaEntrada(entradaPreparada))}</p>}
          <div className="acciones-del-programa">
            <button type="button" className="boton-principal" aria-label={textosGaleria.nombreDeLaAccion(textosGaleria.verPasoAPaso(), titulo)} onClick={() => alAbrir(programa, entradaPreparada)}>
              {textosGaleria.verPasoAPaso()}
            </button>
          </div>
        </>
      )}
      {(pideDatos || muestras.length > 0) && (
        <div className="acciones-del-programa">
          <button type="button" aria-label={textosGaleria.nombreDeLaAccion(textosGaleria.conMisDatos(), titulo)} onClick={() => alAbrir(programa, '')}>
            {textosGaleria.conMisDatos()}
          </button>
        </div>
      )}
    </li>
  );
}

export function Galeria({ galeria, fallo = false, alAbrir }: PropiedadesGaleria) {
  const contenedorRef = useRef<HTMLElement | null>(null);

  // Cuando la lista aparece (o vuelve a aparecer), el foco va a la primera acción.
  useEffect(() => {
    if (galeria !== null) contenedorRef.current?.querySelector('button')?.focus();
  }, [galeria]);

  return (
    <section className="galeria" ref={contenedorRef} aria-labelledby="titulo-de-la-galeria">
      <h2 id="titulo-de-la-galeria">{textosGaleria.titulo()}</h2>
      {galeria === null ? (
        fallo ? (
          <p role="alert">{textosGaleria.noSeCargaron()}</p>
        ) : (
          <p role="status">{textosGaleria.cargando()}</p>
        )
      ) : (
        <>
          <p className="galeria-ayuda">{textosGaleria.ayuda()}</p>
          {galeria.secciones.map((seccion) => (
            <section key={seccion.titulo} className="seccion-de-galeria" aria-label={seccion.titulo}>
              <h3>{seccion.titulo}</h3>
              <ul>
                {seccion.programas.map((programa) => (
                  <Programa key={programa.id} programa={programa} alAbrir={alAbrir} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </section>
  );
}
