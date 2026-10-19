public class VidasEnCero {
    public static void main(String[] args) {
        int vidas = 0;
        do {
            System.out.println("Jugando con " + vidas + " vidas");
            vidas = vidas - 1;
        } while (vidas > 0);
        System.out.println("Fin del juego");
    }
}
