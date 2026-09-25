public class exc09_castingoverflow_no_excepcion {
    public static void main(String[] args) {
        int grande = 200;
        byte b = (byte) grande;
        System.out.println("(byte) 200 = " + b);
        int i = (int) 3.99;
        System.out.println("(int) 3.99 = " + i);
        int negCast = (int) -3.99;
        System.out.println("(int) -3.99 = " + negCast);
        long l = 10_000_000_000L;
        int truncado = (int) l;
        System.out.println("(int) 10000000000L = " + truncado);
    }
}
