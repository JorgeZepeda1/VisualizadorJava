import java.util.Scanner;

public class AcumuladorPromedioCalificaciones {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        double suma = 0;

        for (int i = 1; i <= 5; i++) {
            System.out.print("Calificación " + i + ": ");
            double calificacion = teclado.nextDouble();
            suma = suma + calificacion;
        }

        double promedio = suma / 5;
        System.out.println("Promedio: " + promedio);
    }
}
