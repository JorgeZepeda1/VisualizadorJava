// Un número nunca es verdadero o falso: el cast a boolean no existe.
public class F1CastNumeroABooleano {
    public static void main(String[] args) {
        int n = 1;
        boolean b = (boolean) n;
        System.out.println(b);
    }
}
