// Panel de condición (tarea 4.8, REQ-VIS-006): cuando el paso actual evalúa una condición o elige un caso, muestra la cadena de sustitución completa (`intentos < 10 → 3 < 10 → true`), marca con ✓ la
// rama que corre y con ✗ —ATENUADA, nunca oculta— la que no corre, lista las condiciones de un `else if` en el orden en que se revisaron, y en un `switch` señala el `case` igualado, la caída sin
// `break` y el `default`. Nada va solo por color: ✓ y ✗, y las palabras «se ejecuta» / «no se ejecuta» para el lector de pantalla. Presentacional puro: recibe la condición ya derivada.
import { useId } from 'react';
import type { CondicionVista, Rama } from '../../presentacion/index.ts';
import { textosPaneles } from '../../textos/es-MX/paneles.ts';
import { CadenaDeSustitucion } from './CadenaDeSustitucion.tsx';
import { FraseConCodigo } from './FraseConCodigo.tsx';

function marca(corre: boolean): string {
  return corre ? '✓' : '✗';
}

function RamaDelPrograma({ rama }: { readonly rama: Rama }) {
  return (
    <li data-corre={String(rama.corre)} className={rama.corre ? 'rama' : 'rama atenuada'}>
      <span className="marca" aria-hidden="true">
        {marca(rama.corre)}
      </span>{' '}
      <FraseConCodigo texto={rama.texto} />{' '}
      <span className="solo-lectores">({rama.corre ? textosPaneles.condicion.seEjecuta() : textosPaneles.condicion.noSeEjecuta()})</span>
    </li>
  );
}

function ramasDe(condicion: CondicionVista): readonly Rama[] {
  return condicion.tipo === 'switch' ? condicion.filas : condicion.ramas;
}

function cadenaActual(condicion: CondicionVista): readonly string[] | null {
  switch (condicion.tipo) {
    case 'if':
      return condicion.evaluaciones.length > 1 ? null : (condicion.evaluaciones[0]?.cadena ?? null);
    case 'ciclo':
    case 'switch':
      return condicion.cadena;
  }
}

export interface PropiedadesPanelCondicion {
  readonly condicion: CondicionVista | null;
}

export function PanelCondicion({ condicion }: PropiedadesPanelCondicion) {
  const idDelTitulo = useId();
  if (condicion === null) return null;
  const cadena = cadenaActual(condicion);
  return (
    <section className="panel panel-condicion" aria-labelledby={idDelTitulo}>
      <h2 id={idDelTitulo}>{textosPaneles.condicion.titulo()}</h2>
      {cadena !== null && cadena.length > 0 && <CadenaDeSustitucion cadena={cadena} />}
      {condicion.tipo === 'if' && condicion.evaluaciones.length > 1 && (
        <ol className="condiciones-revisadas" aria-label={textosPaneles.condicion.cadenaDeCondiciones()}>
          {condicion.evaluaciones.map((evaluacion, indice) => (
            <li key={indice} data-corre={String(evaluacion.resultado)} className={evaluacion.resultado ? 'rama' : 'rama atenuada'}>
              <span className="marca" aria-hidden="true">
                {marca(evaluacion.resultado)}
              </span>{' '}
              <code>{evaluacion.cadena.join(' → ')}</code>
            </li>
          ))}
        </ol>
      )}
      <ul className="ramas">
        {ramasDe(condicion).map((rama, indice) => (
          <RamaDelPrograma key={indice} rama={rama} />
        ))}
      </ul>
    </section>
  );
}
