// Control (javac compila): `non-sealed` abre de nuevo la jerarquia.
sealed class Base permits Hija { }
non-sealed class Hija extends Base { }
public class CNonSealedValido {
    public static void main(String[] args) {
        System.out.println("hola");
    }
}
