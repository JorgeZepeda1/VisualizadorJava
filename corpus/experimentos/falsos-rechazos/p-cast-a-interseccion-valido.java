// Control (javac compila): un cast a una interseccion de tipos (`A & B`).
public class PCastAInterseccionValido {
    public static void main(String[] args) {
        Object o = (Object & java.io.Serializable) "a";
        System.out.println(o);
    }
}
