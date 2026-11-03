import java.util.Scanner;

public class VariableDelBloque {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        do {
            System.out.println("Escribe tu edad (de 1 a 120):");
            int edad = teclado.nextInt();
        } while (edad < 1 || edad > 120);
        System.out.println("Gracias");
    }
}
