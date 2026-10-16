// Control (V): las 16 palabras contextuales de Java (menos `var` y `yield`, aparte) valen como nombre de variable.
public class VNombresContextuales {
    public static void main(String[] args) {
        int record = 1;
        int sealed = 2;
        int permits = 3;
        int non = 4;
        int module = 5;
        int open = 6;
        int opens = 7;
        int requires = 8;
        int transitive = 9;
        int exports = 10;
        int to = 11;
        int uses = 12;
        int provides = 13;
        int with = 14;
        System.out.println(record + sealed + permits + non + module + open + opens + requires + transitive + exports + to + uses + provides + with);
    }
}
