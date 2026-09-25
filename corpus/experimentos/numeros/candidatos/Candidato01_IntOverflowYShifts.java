public class Candidato01_IntOverflowYShifts {
    public static void main(String[] args) {
        System.out.println(Integer.MAX_VALUE + 1);
        System.out.println(Integer.MIN_VALUE - 1);
        System.out.println(Integer.MIN_VALUE / -1);
        System.out.println(1 << 35);
        System.out.println(1 << -1);
        System.out.println(-1 >>> 1);
        System.out.println(-8 >> 1);
    }
}
