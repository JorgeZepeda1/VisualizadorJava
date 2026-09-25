public class CalificacionFinal {
    public static void main(String[] args) {
        double examen = 8.7;
        double participacion = 9.2;
        double promedio = (examen + participacion) / 2;

        int calificacionEntera = (int) promedio;
        boolean aprobado = promedio >= 6.0;

        System.out.println("Promedio: " + promedio);
        System.out.println("Calificación entera: " + calificacionEntera);
        System.out.println("¿Aprobado? " + aprobado);
    }
}
