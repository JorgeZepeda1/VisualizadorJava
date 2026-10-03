// Control (javac compila): `new` con argumentos de tipo y con el rombo.
public class KNewConArgumentosDeTipoValido {
    public static void main(String[] args) {
        java.util.ArrayList<String> lista = new java.util.ArrayList<String>();
        java.util.ArrayList<Integer> otra = new java.util.ArrayList<>();
        System.out.println(lista.size() + otra.size());
    }
}
