public class Saludo {
    public static void main(String[] args) {
        final String M0 = "😀";
        final String M1 = M0 + M0;
        final String M2 = M1 + M1;
        final String M3 = M2 + M2;
        final String M4 = M3 + M3;
        final String M5 = M4 + M4;
        final String M6 = M5 + M5;
        final String M7 = M6 + M6;
        final String M8 = M7 + M7;
        final String M9 = M8 + M8;
        final String M10 = M9 + M9;
        final String M11 = M10 + M10;
        final String M12 = M11 + M11;
        final String M13 = M12 + M12;
        String s = M13 + M11 + M9 + M7 + M5 + M3 + M1;
        System.out.println(s.length());
    }
}
