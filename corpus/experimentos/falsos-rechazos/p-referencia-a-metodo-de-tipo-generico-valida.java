// Control (javac compila): `ArrayList<String>::new` es una referencia a metodo cuyo receptor es un tipo generico.
public class PReferenciaAMetodoDeTipoGenericoValida {
    public static void main(String[] args) {
        java.util.Optional.empty().orElseGet(java.util.ArrayList<String>::new);
    }
}
