// trim() se usa sobre un String, no sobre la clase.
public class F6TextoTrimPorClase {
    public static void main(String[] args) {
        String texto = "  hola ";
        String limpio = String.trim();
        System.out.println(limpio + texto);
    }
}
