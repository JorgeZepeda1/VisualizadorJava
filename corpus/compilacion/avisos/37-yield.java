public class Aviso {
    public static void main(String[] args) {
        int dia = 1;
        int resultado = switch (dia) {
            case 1:
                yield 1;
            default:
                yield 0;
        };
    }
}
