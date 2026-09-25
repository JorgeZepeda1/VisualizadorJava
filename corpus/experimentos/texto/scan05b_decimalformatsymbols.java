import java.text.DecimalFormatSymbols;
import java.util.Locale;
public class scan05b_decimalformatsymbols {
    public static void main(String[] args) {
        Locale l = Locale.getDefault();
        DecimalFormatSymbols s = DecimalFormatSymbols.getInstance(l);
        System.out.println("Locale: " + l);
        System.out.println("separador decimal: [" + s.getDecimalSeparator() + "]");
        System.out.println("separador de miles: [" + s.getGroupingSeparator() + "]");
    }
}
