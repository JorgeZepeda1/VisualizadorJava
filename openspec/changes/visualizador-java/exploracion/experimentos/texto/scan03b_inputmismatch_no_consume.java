import java.util.Scanner;
public class scan03b_inputmismatch_no_consume {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Edad: ");
        try {
            int edad = sc.nextInt();
            System.out.println("edad=" + edad);
        } catch (java.util.InputMismatchException e) {
            System.out.println("Error: se esperaba un numero.");
            String recuperado = sc.next();
            System.out.println("El token que fallo sigue ahi (no se consumio): [" + recuperado + "]");
        }
    }
}
