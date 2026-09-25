public class ErrorPorUno {
    public static void main(String[] args) {
        int cuenta1 = 0;
        for (int i = 1; i <= 10; i++) {
            cuenta1++;
        }
        System.out.println("for (i = 1; i <= 10; i++): " + cuenta1 + " vueltas");

        int cuenta2 = 0;
        for (int i = 0; i < 10; i++) {
            cuenta2++;
        }
        System.out.println("for (i = 0; i < 10; i++): " + cuenta2 + " vueltas");

        int cuenta3 = 0;
        for (int i = 1; i < 10; i++) {
            cuenta3++;
        }
        System.out.println("for (i = 1; i < 10; i++): " + cuenta3 + " vueltas (¡CUIDADO! una de menos)");
    }
}
