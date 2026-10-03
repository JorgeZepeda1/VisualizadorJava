// javac: unreported exception IOException — `read()` existe, pero obliga a manejar la excepción.
public class BSystemInRead {
    public static void main(String[] args) {
        int c = System.in.read();
    }
}
