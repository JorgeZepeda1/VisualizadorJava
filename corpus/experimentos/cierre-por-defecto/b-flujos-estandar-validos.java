// Control (javac compila): `System.in` como argumento del `Scanner` y `System.out`/`System.err` como receptor de `println`.
import java.util.Scanner;
public class BFlujosEstandarValidos {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println("Escribe un numero:");
        System.err.println("aviso");
        int n = sc.nextInt();
        System.out.println(n);
    }
}
