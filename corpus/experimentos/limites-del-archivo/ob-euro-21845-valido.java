public class Saludo {
    public static void main(String[] args) {
        final String U0 = "€";
        final String U1 = U0 + U0;
        final String U2 = U1 + U1;
        final String U3 = U2 + U2;
        final String U4 = U3 + U3;
        final String U5 = U4 + U4;
        final String U6 = U5 + U5;
        final String U7 = U6 + U6;
        final String U8 = U7 + U7;
        final String U9 = U8 + U8;
        final String U10 = U9 + U9;
        final String U11 = U10 + U10;
        final String U12 = U11 + U11;
        final String U13 = U12 + U12;
        final String U14 = U13 + U13;
        String s = U14 + U12 + U10 + U8 + U6 + U4 + U2 + U0;
        System.out.println(s.length());
    }
}
