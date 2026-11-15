// Copyright (c) 2026 Enrique Rocha (@soyenriquerocha)
// SPDX-License-Identifier: MIT
/**
 * Medidas de la composición "Galeria" (reel de producto armado solo con imágenes). Puro: sin React, sin Remotion y sin Node,
 * para que lo usen el componente (src/galeria/Galeria.tsx) y el validador (src/galeria/esquema.ts) con los MISMOS números.
 * Todo en px del lienzo 1080×1920.
 *
 * Zona segura: el encargo pide nada importante en el 15 % de arriba ni de abajo (y < 288, y > 1632). La guía pública de
 * Reels (src/estilo/zona-segura.ts) pierde 220 px arriba y 320 abajo (y > 1600): se usa lo más estricto de las dos.
 */
export const ANCHO = 1080;
export const ALTO = 1920;
export const FPS = 30;

export const SEGURA = {arriba: 288, abajo: 1600} as const;

/** Ancho útil de un rótulo y centro vertical del bloque de texto de arriba. */
export const TEXTO = {anchoMax: 940, centroY: 430, interlinea: 1.08, anchoEm: 0.47, tope1: 140, tope2: 120} as const;

/** Zona de la prenda cuando hay texto arriba: entera y sin nada abajo / con una píldora o botón abajo. */
export const PRENDA_LIBRE = {x0: 70, x1: 1010, y0: 600, y1: 1590} as const;
export const PRENDA_CON_PIE = {x0: 70, x1: 1010, y0: 600, y1: 1430} as const;

/** Tarjeta de los planos de detalle. */
export const TARJETA = {w: 920, h: 1040, cx: 540, cy: 1095, radio: 44} as const;

/** Grilla 2×2 de "elige el tuyo": posiciones [col, fila] de cada pieza, en el orden del guion. */
export const GRILLA = {tileW: 480, tileH: 480, margenX: 48, hueco: 24, y0: 600} as const;
export const tileDe = (i: number): {x: number; y: number; w: number; h: number} => {
	const col = i % 2;
	const fila = Math.floor(i / 2);
	return {
		x: GRILLA.margenX + col * (GRILLA.tileW + GRILLA.hueco),
		y: GRILLA.y0 + fila * (GRILLA.tileH + GRILLA.hueco),
		w: GRILLA.tileW,
		h: GRILLA.tileH,
	};
};

/** Píldora de precio y botón del cierre (centros y tamaños). */
export const CHIP = {cx: 540, cy: 1535, w: 520, h: 92} as const;
export const BOTON = {cx: 540, cy: 1520, w: 860, h: 128} as const;

export const COLORES_CLAVE = {rojo: '#FF2D46', naranja: '#FF8A1F', amarillo: '#FFD400'} as const;

/** Tamaño de letra de un rótulo: el mayor que cabe en TEXTO.anchoMax sin pasar del tope (1 línea o 2). */
export function tamanoRotulo(lineas: readonly string[]): number {
	const mayor = Math.max(...lineas.map((l) => l.length));
	const tope = lineas.length === 1 ? TEXTO.tope1 : TEXTO.tope2;
	return Math.floor(Math.min(tope, TEXTO.anchoMax / (mayor * TEXTO.anchoEm)));
}

/** Caja vertical [arriba, abajo] que ocupa un rótulo (centrado en TEXTO.centroY). */
export function cajaRotulo(lineas: readonly string[]): {arriba: number; abajo: number} {
	const alto = lineas.length * tamanoRotulo(lineas) * TEXTO.interlinea;
	return {arriba: TEXTO.centroY - alto / 2, abajo: TEXTO.centroY + alto / 2};
}
