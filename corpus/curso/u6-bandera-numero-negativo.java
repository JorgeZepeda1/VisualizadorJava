import java.util.Scanner;

public class BanderaNumeroNegativo {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        boolean seEncontroNegativo = false;

        for (int i = 1; i <= 5; i++) {
            System.out.print("Número " + i + ": ");
            int numero = teclado.nextInt();
            if (numero < 0) {
                seEncontroNegativo = true;
            }
        }

        if (seEncontroNegativo) {
            System.out.println("Se ingresó al menos un número negativo.");
        } else {
            System.out.println("Todos los números fueron positivos o cero.");
        }
    }
}
