import java.util.Scanner;
 
public class MaquinaSnacks {
 
 
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
 
        // 1. Mostrar productos
        System.out.println("=== MÁQUINA DE SNACKS ===");
        System.out.println("A1 Papas      $18");
        System.out.println("A2 Galletas   $15");
        System.out.println("B1 Agua       $12");
        System.out.println("B2 Refresco   $22");
        System.out.println("B3 Jugo       Agotado");
 
        // 2. Pedir el código y revisarlo con switch
        System.out.print("Código: ");
        String codigo = sc.next().toUpperCase();
 
        String producto;
        int precio;
 
        switch (codigo) {
            case "A1":
                producto = "Papas";
                precio = 18;
                break;
            case "A2":
                producto = "Galletas";
                precio = 15;
                break;
            case "B1":
                producto = "Agua";
                precio = 12;
                break;
            case "B2":
                producto = "Refresco";
                precio = 22;
                break;
            case "B3":
                System.out.println( "Producto agotado" );
                return;
            default:
                System.out.println( "Código inválido");
                return;
        }
 
        // 3. Pedir la cantidad (1 a 3)
        System.out.print("Cantidad (1 a 3): ");
        int cantidad = sc.nextInt();
 
        if (cantidad < 1 || cantidad > 3) {
            System.out.println( "Cantidad no válida" );
            return;
        }
 
        // 4. Calcular el total
        int total = precio * cantidad;
        System.out.println("Total: $" + total);
 
        // 5. Pedir el dinero ($1 a $200)
        System.out.print("Dinero: ");
        int dinero = sc.nextInt();
 
        if (dinero < 1 || dinero > 200) {
            System.out.println("La máquina acepta de $1 a $200");
            return;
        }
 
        // 6. ¿Alcanza el dinero?
        if (dinero < total) {
            System.out.println("Te faltan $" + (total - dinero));
        } else {
            System.out.println("Entregando " + cantidad + " x " + producto + ". Cambio: $" + (dinero - total));
        }
 
        sc.close();
    }
}
