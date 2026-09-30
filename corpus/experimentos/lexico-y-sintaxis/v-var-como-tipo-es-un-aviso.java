// Control (V): `var` como TIPO de una variable local es Java válido (Java 10+) que el subconjunto no simula: aviso, y aun así puede haber una variable llamada `var`.
public class VVarComoTipo {
    public static void main(String[] args) {
        var numero = 5;
        var var = numero + 1;
        System.out.println(var);
    }
}
