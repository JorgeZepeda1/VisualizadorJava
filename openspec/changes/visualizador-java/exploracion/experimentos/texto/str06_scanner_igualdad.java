import java.util.Scanner;

public class str06_scanner_igualdad {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Escribe si o no: ");
        String resp = sc.next();
        System.out.println("resp == \"si\": " + (resp == "si"));
        System.out.println("resp.equals(\"si\"): " + resp.equals("si"));
        sc.close();
    }
}
