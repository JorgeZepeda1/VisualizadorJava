public class EscaleraElseIfOrdenIncorrecto {
    public static void main(String[] args) {
        int calificacion = 95;

        // INCORRECTO: la condición más general va primero
        if (calificacion >= 70) {
            System.out.println("C");   // ¡una calificación de 95 también entra aquí!
        } else if (calificacion >= 90) {
            System.out.println("A");   // nunca se alcanza para calificaciones >= 90
        }
    }
}
