public class CicloInfinitoDemo {
    public static void main(String[] args) {
        int contador = 1;

        while (contador <= 5) {
            System.out.println("Vuelta número " + contador);
            // ¡falta contador = contador + 1;! el ciclo se repite para siempre
        }
    }
}
