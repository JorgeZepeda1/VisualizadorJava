// Control (javac compila): una clase sellada de nivel superior, antes de la clase del programa.
sealed class Base permits Hija { }
final class Hija extends Base { }
public class CSealedClaseDeNivelSuperiorValido {
    public static void main(String[] args) {
        System.out.println("hola");
    }
}
