// Control (N2): nombres que CONTIENEN una palabra reservada, o que solo se le parecen, son identificadores válidos.
public class N2NombresParecidos {
    public static void main(String[] args) {
        int nativo = 1;
        int _x = 2;
        int x_ = 3;
        int enumerado = 4;
        int $goto = 5;
        int Native = 6;
        int Enum = 7;
        int goto1 = 8;
        int __ = 9;
        int extendsAlgo = 10;
        System.out.println(nativo + _x + x_ + enumerado + $goto + Native + Enum + goto1 + __ + extendsAlgo);
    }
}
