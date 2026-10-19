import java.util.Scanner;

public class HuboUnNegativo {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        boolean hayNegativo = false;
        int lectura = 1;
        while (lectura <= 4) {
            int numero = teclado.nextInt();
            if (numero < 0) {
                hayNegativo = true;
            }
            lectura = lectura + 1;
        }
        System.out.println("¿Hubo algún negativo? " + hayNegativo);
    }
}
