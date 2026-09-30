// Un número no se convierte en String con un cast.
public class F1CastNumeroATexto {
    public static void main(String[] args) {
        int edad = 18;
        String texto = (String) edad;
        System.out.println(texto);
    }
}
