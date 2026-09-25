import java.util.Scanner;
public class scan03_inputmismatch {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Edad: ");
        int edad = sc.nextInt();
        System.out.println("edad=" + edad);
    }
}
