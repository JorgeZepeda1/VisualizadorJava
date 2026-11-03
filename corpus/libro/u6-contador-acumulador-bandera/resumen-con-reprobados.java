import java.util.Scanner;

public class ResumenConReprobados {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int alumno = 1;
        int suma = 0;
        int reprobados = 0;
        boolean hubo10 = false;
        while (alumno <= 5) {
            int calificacion = teclado.nextInt();
            suma = suma + calificacion;
            if (calificacion < 6) {
                reprobados = reprobados + 1;
            }
            if (calificacion == 10) {
                hubo10 = true;
            }
            alumno = alumno + 1;
        }
        System.out.println("Suma: " + suma);
        System.out.println("Reprobados: " + reprobados);
        System.out.println("¿Hubo un 10? " + hubo10);
    }
}
