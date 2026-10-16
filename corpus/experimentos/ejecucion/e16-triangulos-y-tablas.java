public class MiPrograma {
    public static void main(String[] args) {
        for (int fila = 1; fila <= 5; fila++) {
            for (int esp = 0; esp < 5 - fila; esp++) {
                System.out.print(" ");
            }
            for (int estrella = 0; estrella < 2 * fila - 1; estrella++) {
                System.out.print("*");
            }
            System.out.println();
        }
        for (int fila = 1; fila <= 4; fila++) {
            for (int col = 1; col <= 4; col++) {
                System.out.print(fila * col + "\t");
            }
            System.out.println();
        }
        for (int n = 5; n >= 1; n--) {
            String linea = "";
            for (int k = 1; k <= n; k++) {
                linea += k;
            }
            System.out.println(linea);
        }
        for (int i = 1; i <= 3; i++) {
            for (int j = 1; j <= 3; j++) {
                if (i == j) {
                    continue;
                }
                if (i + j == 5) {
                    break;
                }
                System.out.print(i + "" + j + " ");
            }
        }
        System.out.println();
        int contador = 0;
        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 4; j++) {
                for (int k = 0; k < 4; k++) {
                    if (i < j && j < k) {
                        contador++;
                    }
                }
            }
        }
        System.out.println("ternas crecientes: " + contador);
        char letra = 'A';
        for (int fila = 1; fila <= 3; fila++) {
            for (int col = 0; col < fila; col++) {
                System.out.print(letra);
                letra++;
            }
            System.out.println();
        }
    }
}
