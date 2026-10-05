public class Saludo {
    public static void main(String[] args) {
        final String A0 = "a";
        final String A1 = A0 + A0;
        final String A2 = A1 + A1;
        final String A3 = A2 + A2;
        final String A4 = A3 + A3;
        final String A5 = A4 + A4;
        final String A6 = A5 + A5;
        final String A7 = A6 + A6;
        final String A8 = A7 + A7;
        final String A9 = A8 + A8;
        final String A10 = A9 + A9;
        final String A11 = A10 + A10;
        final String A12 = A11 + A11;
        final String A13 = A12 + A12;
        final String A14 = A13 + A13;
        final String A15 = A14 + A14;
        int x = 1;
        String s = A15 + A14 + A13 + A12 + A11 + A10 + A9 + A8 + A7 + A6 + A5 + A4 + A3 + A2 + A1 + (char) 1 + x;
        System.out.println(s.length());
    }
}
