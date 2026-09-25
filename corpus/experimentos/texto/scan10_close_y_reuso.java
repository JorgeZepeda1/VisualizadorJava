import java.util.Scanner;
public class scan10_close_y_reuso {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println("leido: " + sc.next());
        sc.close();
        System.out.println("intentando leer tras close...");
        String b = sc.next();
        System.out.println("no debe llegar: " + b);
    }
}
