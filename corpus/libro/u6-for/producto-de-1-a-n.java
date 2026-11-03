import java.util.Scanner;

public class ProductoDe1AN {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int n = teclado.nextInt();
        int producto = 1;
        for (int i = 1; i <= n; i++) {
            producto = producto * i;
        }
        System.out.println("El producto es " + producto);
    }
}
