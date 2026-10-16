// Control: una asignación dentro del propio inicializador es válida (javac la compila): antes se rechazaba como variable no declarada.
public class N6AsignacionEnSuInicializadorValida {
    public static void main(String[] args) {
        int y = (y = 5) + 1;
        System.out.println(y);
    }
}
