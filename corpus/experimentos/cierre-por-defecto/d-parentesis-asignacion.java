// javac: not a statement — los paréntesis convierten la asignación en una expresión (JLS 14.8).
public class DParentesisAsignacion {
    public static void main(String[] args) {
        int x = 1;
        (x = 2);
    }
}
