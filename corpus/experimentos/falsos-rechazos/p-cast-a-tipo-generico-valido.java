// Control (javac compila): un cast a un tipo generico (aviso de genericos).
public class PCastATipoGenericoValido {
    public static void main(String[] args) {
        Object o = new java.util.ArrayList<String>();
        java.util.List<String> l = (java.util.List<String>) o;
        System.out.println(l.size());
    }
}
