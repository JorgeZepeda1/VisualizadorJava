import java.util.Scanner;

public class MayoresQue100 {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int lectura = 1;
        int cuantos = 0;
        while (lectura <= 5) {
            int numero = teclado.nextInt();
            if (numero > 100) {
                cuantos = cuantos + 1;
            }
            lectura = lectura + 1;
        }
        System.out.println("Mayores que 100: " + cuantos);
    }
}
