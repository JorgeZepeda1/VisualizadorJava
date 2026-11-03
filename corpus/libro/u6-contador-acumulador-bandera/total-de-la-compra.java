import java.util.Scanner;

public class TotalDeLaCompra {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int producto = 1;
        int total = 0;
        while (producto <= 3) {
            int precio = teclado.nextInt();
            total = total + precio;
            producto = producto + 1;
        }
        System.out.println("Total: " + total);
    }
}
