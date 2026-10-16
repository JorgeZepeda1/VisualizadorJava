// Control (javac compila): ocho nombres que JavaScript trae en todos sus objetos son nombres de variable comunes en Java.
public class EPrototipoNombresValidos {
    public static void main(String[] args) {
        int constructor = 1;
        int toString = 2;
        int valueOf = 3;
        int hasOwnProperty = 4;
        int __proto__ = 5;
        int isPrototypeOf = 6;
        int propertyIsEnumerable = 7;
        int toLocaleString = 8;
        int suma = constructor + toString + valueOf + hasOwnProperty + __proto__ + isPrototypeOf + propertyIsEnumerable + toLocaleString;
        System.out.println(suma);
    }
}
