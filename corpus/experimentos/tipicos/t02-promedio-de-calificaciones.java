import java.util.Scanner;

public class Promedio {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        System.out.print("Calificación 1: ");
        double primera = teclado.nextDouble();
        System.out.print("Calificación 2: ");
        double segunda = teclado.nextDouble();
        System.out.print("Calificación 3: ");
        double tercera = teclado.nextDouble();

        double promedio = (primera + segunda + tercera) / 3;
        System.out.printf("Tu promedio es %.2f%n", promedio);

        if (promedio >= 9) {
            System.out.println("Excelente");
        } else if (promedio >= 8) {
            System.out.println("Muy bien");
        } else if (promedio >= 6) {
            System.out.println("Aprobado");
        } else {
            System.out.println("Reprobado");
        }
    }
}
