public class Aviso {
    public static void main(String[] args) {
        externo:
        for (int i = 0; i < 3; i++) {
            continue externo;
        }
    }
}
