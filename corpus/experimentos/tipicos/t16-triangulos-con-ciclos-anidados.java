public class Triangulos {
    public static void main(String[] args) {
        int altura = 5;
        for (int fila = 1; fila <= altura; fila++) {
            for (int columna = 1; columna <= fila; columna++) {
                System.out.print("*");
            }
            System.out.println();
        }
        System.out.println();
        for (int fila = altura; fila >= 1; fila--) {
            for (int espacio = 0; espacio < altura - fila; espacio++) {
                System.out.print(" ");
            }
            for (int columna = 1; columna <= fila; columna++) {
                System.out.print("* ");
            }
            System.out.println();
        }
    }
}
