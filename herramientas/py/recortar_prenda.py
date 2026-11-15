# Copyright (c) 2026 Enrique Rocha (@soyenriquerocha)
# SPDX-License-Identifier: MIT
"""
Recorta una maqueta de prenda (foto "puesto en…") de su fondo y deja una versión ×2 para los planos de detalle.

    .venv/bin/python herramientas/py/recortar_prenda.py <imagen.jpg> <carpeta-salida> <id>

Salidas en <carpeta-salida>:
  <id>-recorte.png   la prenda con alfa, recortada a su caja (la imprime en "caja": x, y, ancho y alto dentro del original)
  <id>-2x.jpg        la imagen entera a ×2 (Lanczos + un poco de nitidez), para acercarse al estampado

Método (sin modelos ni red): las maquetas de este tipo traen un fondo beige cálido liso y la prenda es negra, amarilla o
gris neutra. Se marca como fondo lo que tiene ese beige (R-B entre 20 y 52, R-G entre 6 y 26) y toca el borde; la
prenda es el componente más grande de lo demás, con huecos rellenos y el borde suavizado. Si el fondo de tu maqueta
es otro, dilo: el resultado se revisa a ojo antes de usarlo. Imprime un JSON con el tamaño, la caja del recorte y el % de imagen que ocupa.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter


def recortar(imagen: np.ndarray) -> np.ndarray:
    h, w = imagen.shape[:2]
    b, g, r = (imagen[:, :, i].astype(np.int32) for i in range(3))
    luz = (r + g + b) // 3
    fondo = ((r - b >= 20) & (r - b <= 52) & (r - g >= 6) & (r - g <= 26) & (luz > 135) & (luz < 225)).astype(np.uint8) * 255
    fondo = cv2.morphologyEx(fondo, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    _, etiquetas, _, _ = cv2.connectedComponentsWithStats(fondo)
    orilla = set(np.unique(np.concatenate([etiquetas[0], etiquetas[-1], etiquetas[:, 0], etiquetas[:, -1]]))) - {0}
    atras = np.isin(etiquetas, list(orilla)).astype(np.uint8) * 255
    prenda = 255 - atras
    n, etiquetas, estadisticas, _ = cv2.connectedComponentsWithStats(prenda)
    if n < 2:
        raise SystemExit('no encontré la prenda: el fondo no se parece al beige de las maquetas')
    mayor = 1 + int(np.argmax(estadisticas[1:, cv2.CC_STAT_AREA]))
    prenda = np.where(etiquetas == mayor, 255, 0).astype(np.uint8)
    prenda = cv2.morphologyEx(prenda, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    contornos, _ = cv2.findContours(prenda, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    lleno = np.zeros_like(prenda)
    cv2.drawContours(lleno, contornos, -1, 255, -1)
    lleno = cv2.erode(lleno, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    alfa = cv2.GaussianBlur(lleno, (0, 0), 1.2)
    salida = cv2.cvtColor(imagen, cv2.COLOR_BGR2BGRA)
    salida[:, :, 3] = alfa
    return salida


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    origen, carpeta, ident = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
    imagen = cv2.imread(str(origen))
    if imagen is None:
        raise SystemExit(f'no pude leer {origen}')
    carpeta.mkdir(parents=True, exist_ok=True)
    recorte = recortar(imagen)
    h, w = imagen.shape[:2]
    ys, xs = np.where(recorte[:, :, 3] > 8)
    x0, x1 = max(0, int(xs.min()) - 4), min(w, int(xs.max()) + 5)
    y0, y1 = max(0, int(ys.min()) - 4), min(h, int(ys.max()) + 5)
    cv2.imwrite(str(carpeta / f'{ident}-recorte.png'), recorte[y0:y1, x0:x1])
    doble = Image.open(origen).convert('RGB').resize((w * 2, h * 2), Image.LANCZOS)
    doble = doble.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
    doble.save(carpeta / f'{ident}-2x.jpg', quality=94)
    print(json.dumps({'id': ident, 'ancho': w, 'alto': h, 'caja': [x0, y0, x1 - x0, y1 - y0], 'prenda_pct': round(float(recorte[:, :, 3].mean()) / 2.55, 1)}))


if __name__ == '__main__':
    main()
