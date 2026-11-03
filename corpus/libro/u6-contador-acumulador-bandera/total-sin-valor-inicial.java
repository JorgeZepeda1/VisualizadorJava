import java.util.Scanner;

public class TotalSinValorInicial {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int producto = 1;
        int total;
        while (producto <= 3) {
            int precio = teclado.nextInt();
            total = total + precio;
            producto = producto + 1;
        }
        System.out.println("Total: " + total);
    }
}
