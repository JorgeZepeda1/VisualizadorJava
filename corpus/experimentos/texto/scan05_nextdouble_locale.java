import java.util.Locale;
import java.util.Scanner;
public class scan05_nextdouble_locale {
    public static void main(String[] args) {
        System.out.println("Locale por omision de la JVM: " + Locale.getDefault());
        Scanner sc = new Scanner(System.in);
        System.out.print("Precio: ");
        double d = sc.nextDouble();
        System.out.println("d=" + d);
    }
}
