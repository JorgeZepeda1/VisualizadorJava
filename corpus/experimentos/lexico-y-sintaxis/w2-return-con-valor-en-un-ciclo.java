// javac (prob.found.req): tampoco dentro de un ciclo.
public class W2ReturnConValorEnUnCiclo {
    public static void main(String[] args) {
        int i = 0;
        while (i < 3) {
            i++;
            return i;
        }
    }
}
