public class MiPrograma {
    public static void main(String[] args) {
        int i = 1;
        while (i <= 5) {
            System.out.print(i + " ");
            i++;
        }
        System.out.println();
        int sinEntrar = 10;
        while (sinEntrar < 5) {
            System.out.println("no se imprime");
            sinEntrar++;
        }
        int unaVez = 10;
        do {
            System.out.println("do-while corre una vez con " + unaVez);
            unaVez++;
        } while (unaVez < 5);
        int cuenta = 3;
        do {
            System.out.print(cuenta + "...");
            cuenta--;
        } while (cuenta > 0);
        System.out.println("listo");
        int suma = 0;
        int n = 1;
        while (suma < 50) {
            suma += n;
            n += 2;
        }
        System.out.println("suma = " + suma + " n = " + n);
        int fila = 1;
        while (fila <= 4) {
            int col = 1;
            while (col <= fila) {
                System.out.print("*");
                col++;
            }
            System.out.println();
            fila++;
        }
        int corte = 0;
        while (true) {
            corte++;
            if (corte == 7) {
                break;
            }
        }
        System.out.println("corte = " + corte);
        int impares = 0;
        int j = 0;
        while (j < 10) {
            j++;
            if (j % 2 == 0) {
                continue;
            }
            impares += j;
        }
        System.out.println("suma de impares = " + impares);
        int digitos = 0;
        long numero = 9876543210L;
        while (numero > 0) {
            numero /= 10;
            digitos++;
        }
        System.out.println("digitos = " + digitos);
        int invertido = 0;
        int original = 12345;
        while (original != 0) {
            invertido = invertido * 10 + original % 10;
            original /= 10;
        }
        System.out.println("invertido = " + invertido);
        int d = 0;
        do {
            d++;
            if (d == 2) {
                continue;
            }
            System.out.print("d=" + d + " ");
        } while (d < 4);
        System.out.println();
        boolean seguir = true;
        int pasos = 0;
        while (seguir) {
            pasos++;
            seguir = pasos < 3;
        }
        System.out.println("pasos = " + pasos);
        int g = 48;
        int h = 18;
        while (h != 0) {
            int t = h;
            h = g % h;
            g = t;
        }
        System.out.println("mcd = " + g);
    }
}
