import java.util.Scanner;

public class VerificarVoto {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);

        System.out.print("¿Cuál es tu edad? ");
        int edad = teclado.nextInt();

        if (edad >= 18) {
            System.out.println("Puedes votar.");
        } else {
            System.out.println("Todavía no tienes edad para votar.");
        }
    }
}
