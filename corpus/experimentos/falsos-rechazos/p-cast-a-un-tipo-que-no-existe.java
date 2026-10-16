// javac: `package a does not exist` — `(a.b)(1)` es una conversion al tipo `a.b`, no una llamada.
public class PCastAUnTipoQueNoExiste {
    public static void main(String[] args) {
        int x = (a.b)(1);
    }
}
