import java.util.Scanner;

public class IntentosHastaEl7 {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int numero;
        int intentos = 0;
        do {
            numero = teclado.nextInt();
            intentos = intentos + 1;
        } while (numero != 7);
        System.out.println("Intentos: " + intentos);
    }
}
