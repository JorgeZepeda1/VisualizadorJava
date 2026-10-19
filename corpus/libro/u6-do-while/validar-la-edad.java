import java.util.Scanner;

public class ValidarLaEdad {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int edad;
        do {
            System.out.println("Escribe tu edad (de 1 a 120):");
            edad = teclado.nextInt();
        } while (edad < 1 || edad > 120);
        System.out.println("Tu edad es " + edad);
    }
}
