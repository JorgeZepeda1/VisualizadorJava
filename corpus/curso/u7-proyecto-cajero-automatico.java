import java.util.Scanner;

public class Cajero {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int saldo = 1000;
        boolean continuar = true;

        while (continuar) {
            System.out.println("===== CAJERO =====");
            System.out.println("1. Consultar saldo");
            System.out.println("2. Depositar");
            System.out.println("3. Retirar");
            System.out.println("4. Salir");
            System.out.print("Elige una opción: ");
            int opcion = teclado.nextInt();

            switch (opcion) {
                case 1:
                    System.out.println("Tu saldo es: " + saldo);
                    break;
                case 2:
                    System.out.print("¿Cuánto quieres depositar? ");
                    int deposito = teclado.nextInt();
                    saldo = saldo + deposito;
                    System.out.println("Depósito realizado. Tu saldo es: " + saldo);
                    break;
                case 3:
                    System.out.print("¿Cuánto quieres retirar? ");
                    int retiro = teclado.nextInt();
                    if (retiro <= saldo) {
                        saldo = saldo - retiro;
                        System.out.println("Retiro realizado. Tu saldo es: " + saldo);
                    } else {
                        System.out.println("Fondos insuficientes");
                    }
                    break;
                case 4:
                    System.out.println("Gracias por usar el cajero");
                    continuar = false;
                    break;
                default:
                    System.out.println("Opción no válida");
            }
        }
    }
}
