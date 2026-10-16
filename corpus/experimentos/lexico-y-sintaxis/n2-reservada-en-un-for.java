// javac (not.stmt): `volatile` es palabra reservada, también como contador de un `for`.
public class N2ReservadaEnUnFor {
    public static void main(String[] args) {
        for (int volatile = 0; volatile < 3; volatile++) {
        }
    }
}
