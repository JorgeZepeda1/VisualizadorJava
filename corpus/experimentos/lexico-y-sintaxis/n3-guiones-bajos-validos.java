// Control (N3): entre dos dígitos cualquier cantidad de guiones bajos es válida, en enteros, `long` y `double`.
public class N3GuionesBajosValidos {
    public static void main(String[] args) {
        int a = 1_000;
        int b = 1__0;
        long c = 1_000_000L;
        double d = 1_000.5_0;
        double e = 1e1_0;
        double f = 3_1.4_1e+1_0;
        System.out.println(a + b + c + d + e + f);
    }
}
