public class err31_etiqueta_break_no_existe {
    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) {
            if (i == 1) break otraEtiqueta;
            System.out.println(i);
        }
    }
}
