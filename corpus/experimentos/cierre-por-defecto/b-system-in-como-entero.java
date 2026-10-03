// javac: `InputStream` no se convierte en `int` — el alumno olvidó el `Scanner`.
public class BSystemInComoEntero {
    public static void main(String[] args) {
        int x = System.in;
    }
}
