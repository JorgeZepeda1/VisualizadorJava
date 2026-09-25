public class flow08_break_continue_etiquetas {
    public static void main(String[] args) {
        System.out.println("--- break simple en anidado ---");
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (j == 1) break;
                System.out.println("i=" + i + " j=" + j);
            }
        }
        System.out.println("--- break con etiqueta ---");
        externo:
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (i == 1 && j == 1) break externo;
                System.out.println("i=" + i + " j=" + j);
            }
        }
        System.out.println("--- continue con etiqueta ---");
        etiquetaExterna:
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (j == 1) continue etiquetaExterna;
                System.out.println("i=" + i + " j=" + j);
            }
        }
    }
}
