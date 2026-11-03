import java.util.Scanner;

public class TotalQueSeReinicia {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int producto = 1;
        while (producto <= 3) {
            int precio = teclado.nextInt();
            int total = 0;
            total = total + precio;
            System.out.println("Total: " + total);
            producto = producto + 1;
        }
    }
}
