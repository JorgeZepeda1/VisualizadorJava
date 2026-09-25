public class flow12_alcance_bloques {
    public static void main(String[] args) {
        int x = 1;
        {
            int y = 2;
            System.out.println("dentro del bloque x=" + x + " y=" + y);
        }
        // y no existe aqui
        for (int i = 0; i < 2; i++) {
            System.out.println("i=" + i);
        }
        // i no existe aqui
        System.out.println("x sigue viva=" + x);
    }
}
