public class MiPrograma {
    public static void main(String[] args) {
        System.out.println("inicio");
        int i = 0;
        while (true) {
            i++;
            for (int j = 0; j < 5; j++) {
                if (i * j == 6) {
                    System.out.println("encontrado " + i + " " + j);
                    switch (j) {
                        case 3:
                            System.out.println("saliendo desde un switch");
                            return;
                        default:
                            System.out.println("no deberia");
                    }
                }
            }
        }
    }
}
