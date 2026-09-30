// boolean y int no se convierten entre sí con un cast.
public class F1CastBooleanoAInt {
    public static void main(String[] args) {
        boolean activo = true;
        int valor = (int) activo;
        System.out.println(valor);
    }
}
