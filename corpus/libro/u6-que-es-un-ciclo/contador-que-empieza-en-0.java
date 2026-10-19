public class ContadorQueEmpiezaEn0 {
    public static void main(String[] args) {
        int contador = 0;
        while (contador < 3) {
            contador = contador + 1;
            System.out.println("Contador: " + contador);
        }
        System.out.println("Terminó con " + contador);
    }
}
