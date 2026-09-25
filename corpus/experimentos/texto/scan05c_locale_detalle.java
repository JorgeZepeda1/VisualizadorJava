import java.text.DecimalFormatSymbols;
import java.util.Locale;
public class scan05c_locale_detalle {
    public static void main(String[] args) {
        Locale l = Locale.getDefault();
        DecimalFormatSymbols s = DecimalFormatSymbols.getInstance(l);
        System.out.println("user.language=" + System.getProperty("user.language"));
        System.out.println("user.country=" + System.getProperty("user.country"));
        System.out.println("l.getLanguage()=" + l.getLanguage());
        System.out.println("l.getCountry()=" + l.getCountry());
        System.out.println("l.toString()=" + l.toString());
        System.out.println("separador decimal=[" + s.getDecimalSeparator() + "]");
        System.out.println("separador miles=[" + s.getGroupingSeparator() + "]");
    }
}
