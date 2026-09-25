public class ContadorDePares {
    public static void main(String[] args) {
        int contador = 0;

        for (int i = 1; i <= 20; i++) {
            if (i % 2 == 0) {
                contador = contador + 1;
            }
        }

        System.out.println("Números pares encontrados: " + contador);
    }
}
