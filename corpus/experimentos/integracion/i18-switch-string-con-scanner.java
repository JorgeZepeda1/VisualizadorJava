import java.util.Scanner;

public class Prueba {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        double saldo = 100.50;
        boolean continuar = true;
        while (continuar) {
            System.out.print("Operación (D/R/S): ");
            String op = sc.next().trim().toUpperCase();
            switch (op) {
                case "D":
                    double monto = sc.nextDouble();
                    saldo += monto;
                    System.out.printf("Depósito de $%.2f. Saldo: $%,.2f%n", monto, saldo);
                    break;
                case "R":
                    double retiro = sc.nextDouble();
                    if (retiro > saldo) {
                        System.out.println("Fondos insuficientes (saldo " + saldo + ")");
                    } else {
                        saldo -= retiro;
                        System.out.println("Retiro exitoso. Saldo: " + saldo);
                    }
                    break;
                case "S":
                    continuar = false;
                    break;
                default:
                    System.out.println("Opción desconocida: " + op);
            }
        }
        System.out.println("Saldo final: " + saldo);
    }
}
