// Control (N4): las demás formas de flotante hexadecimal (fracción, exponente con signo, sufijo) también son válidas.
public class N4FlotanteHexadecimalConFraccion {
    public static void main(String[] args) {
        double a = 0x1.8p1;
        double b = 0X1P-2;
        double c = 0x.8p0;
        double d = 0x1p3d;
    }
}
