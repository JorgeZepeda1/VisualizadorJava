// javac: `<identifier> expected` — solo un nombre de tipo puede llevar `.class`.
public class PLiteralDeClaseDeUnaLlamada {
    public static void main(String[] args) {
        Object o = f().class;
    }
}
