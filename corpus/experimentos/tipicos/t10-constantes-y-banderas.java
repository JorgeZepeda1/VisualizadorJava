public class Constantes {
    public static void main(String[] args) {
        final boolean MODO_PRUEBA = true;
        final int LIMITE = 5;
        int descuento;
        if (MODO_PRUEBA) {
            descuento = 10;
        }
        System.out.println("Descuento: " + descuento);

        int contador = 0;
        boolean encontrado = false;
        while (true) {
            contador++;
            if (contador * contador > 30) {
                encontrado = true;
                break;
            }
        }
        System.out.println("Primer número cuyo cuadrado supera 30: " + contador + " (" + encontrado + ")");

        int suma = 0;
        for (;;) {
            suma += LIMITE;
            if (suma >= 20) {
                break;
            }
        }
        System.out.println("Suma: " + suma);
    }
}
