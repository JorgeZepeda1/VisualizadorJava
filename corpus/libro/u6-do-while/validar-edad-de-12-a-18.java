import java.util.Scanner;

public class ValidarEdadDe12A18 {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int edad;
        do {
            System.out.println("Escribe tu edad (de 12 a 18):");
            edad = teclado.nextInt();
        } while (edad < 12 || edad > 18);
        System.out.println("Tu edad es " + edad);
    }
}
