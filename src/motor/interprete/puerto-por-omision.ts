// El puerto de la biblioteca que usan `compilar()` y `crearEjecucion()` cuando nadie les da otro (tarea 2.19). Es el ÚNICO lugar donde se conecta
// la biblioteca (`biblioteca/{formato,salida,entrada,texto,matematicas,aleatorio,excepciones}`) al intérprete: al integrar la parte A del hito 1,
// este valor pasa de `PUERTO_VACIO` a un puerto con sus operaciones y su `Double.toString`, y todo programa que las use deja de ser
// `ejecucion-no-disponible` sin tocar el intérprete. Mientras tanto, lo que necesita la biblioteca no se ejecuta (D2, regla 5 de CLAUDE.md).
import { PUERTO_VACIO, type PuertoBiblioteca } from './puerto-biblioteca.ts';

export const PUERTO_POR_OMISION: PuertoBiblioteca = PUERTO_VACIO;
