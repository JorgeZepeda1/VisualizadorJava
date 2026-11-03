public class PotenciasDe2 {
    public static void main(String[] args) {
        int potencia = 1;
        int vueltas = 0;
        while (potencia < 50) {
            potencia = potencia * 2;
            vueltas = vueltas + 1;
        }
        System.out.println("Potencia: " + potencia);
        System.out.println("Vueltas: " + vueltas);
    }
}
