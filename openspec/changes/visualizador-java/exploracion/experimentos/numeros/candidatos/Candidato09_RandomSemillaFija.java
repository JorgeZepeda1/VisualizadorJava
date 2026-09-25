import java.util.Random;

public class Candidato09_RandomSemillaFija {
    public static void main(String[] args) {
        Random r = new Random(12345L);
        for (int i = 0; i < 5; i++) {
            System.out.println(r.nextInt(100) + 1);
        }
        System.out.println(r.nextDouble());
        System.out.println(r.nextBoolean());
    }
}
