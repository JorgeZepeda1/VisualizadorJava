import java.util.Scanner;

public class MayoresQue10 {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int lectura = 1;
        int mayores = 0;
        while (lectura <= 4) {
            int numero = teclado.nextInt();
            if (numero > 10) {
                mayores = mayores + 1;
            }
            lectura = lectura + 1;
        }
        System.out.println("Mayores que 10: " + mayores);
    }
}
