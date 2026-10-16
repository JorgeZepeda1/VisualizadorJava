// Una variable final no se puede modificar con ++.
public class F3FinalIncremento {
    public static void main(String[] args) {
        final int limite = 5;
        limite++;
        System.out.println(limite);
    }
}
