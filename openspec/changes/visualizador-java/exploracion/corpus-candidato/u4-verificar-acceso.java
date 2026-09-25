import java.util.Scanner;

public class VerificarAcceso {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);

        System.out.print("¿Cuál es tu estatura en cm? ");
        int estatura = teclado.nextInt();

        System.out.print("¿Vienes acompañado de un adulto? (true/false) ");
        boolean acompanado = teclado.nextBoolean();

        boolean puedeSubir = (estatura >= 120) || acompanado;

        System.out.println("¿Puede subir a la atracción? " + puedeSubir);
    }
}
