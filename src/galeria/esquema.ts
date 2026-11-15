// Copyright (c) 2026 Enrique Rocha (@soyenriquerocha)
// SPDX-License-Identifier: MIT
/**
 * Contrato de la "galería" (reel de producto armado solo con imágenes, sin video crudo): lo escribe el director (Claude)
 * en proyectos/<slug>/galeria-vN.json y lo renderiza la composición "Galeria" (src/galeria/Galeria.tsx) tal cual.
 * Tiempos en segundos; coordenadas en el lienzo 1080×1920 (src/galeria/layout.ts).
 *
 * Puro: sin React, sin Remotion y sin Node. `validarGaleria` revisa lo que el encargo exige y devuelve
 * "cumple X de Y checks (Z N/A)": cada check dice qué regla es y por qué falla.
 */
import {z} from 'zod';
import {BOTON, CHIP, FPS, SEGURA, cajaRotulo} from './layout';

const Color = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const segundos = z.number().nonnegative();

export const Paleta = z.object({a: Color, b: Color, brillo: Color});

export const Pieza = z.object({
	id: z.string().min(1),
	/** Nombre real de la pieza tal como lo da el encargo (o lo que se ve, si el encargo no la numera). */
	nombre: z.string().min(1),
	prenda: z.string().min(1),
	/** Prenda recortada con alfa y la imagen ×2 para el detalle, relativas a public/ (p/<slug>/trabajo/…). */
	recorte: z.string().min(1),
	original_2x: z.string().min(1),
	/** Tamaño del recorte (ancho, alto), ya sin el margen de la foto (herramientas/py/recortar_prenda.py imprime su caja). */
	recorte_dim: z.tuple([z.number().int().positive(), z.number().int().positive()]),
	/** Tamaño de la imagen original (1×); el archivo ×2 mide el doble. */
	dim: z.tuple([z.number().int().positive(), z.number().int().positive()]),
	/** Detalle del estampado en px del original: centro y ancho visible con zoom 1. */
	detalle: z.object({cx: z.number(), cy: z.number(), ancho: z.number().positive()}),
	/** Dónde está el estampado dentro del recorte (0–1), origen del acercamiento. */
	estampado: z.object({x: z.number().min(0).max(1), y: z.number().min(0).max(1)}),
	paleta: Paleta,
});

export const Clave = z.enum(['rojo', 'naranja', 'amarillo']);
export const Parte = z.object({t: z.string().min(1), clave: Clave.optional()});

export const Texto = z.object({
	/** Líneas de partes: cada parte es un trozo de texto y puede ir en color si es una palabra clave. */
	lineas: z.array(z.array(Parte).min(1)).min(1).max(2),
	entrada: z.enum(['pop', 'deslizar']),
	/** true: es el mismo rótulo de la escena anterior (no vuelve a animar su entrada). */
	continua: z.boolean().default(false),
});

export const Escena = z.object({
	id: z.string().min(1),
	desde: segundos,
	hasta: segundos,
	tipo: z.enum(['entera', 'detalle', 'grilla', 'seleccion', 'cierre']),
	pieza: z.string().min(1).nullable(),
	/** Cómo entra la imagen: desenfoque→nítido, zoom rápido en corte seco o corte a secas. */
	entrada: z.enum(['desenfoque', 'zoom-corte', 'corte']),
	flash: z.enum(['rojo', 'violeta']).nullable(),
	/** Zoom de cámara de principio a fin; `pan` (solo detalle) = [x0, y0, x1, y1] en px del original, sumados al centro. */
	camara: z.object({zoom: z.tuple([z.number().positive(), z.number().positive()]), pan: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional()}),
	texto: Texto.nullable(),
	/** Píldora pequeña (precio) y botón del cierre. */
	chip: z.string().min(1).nullable(),
	boton: z.string().min(1).nullable(),
	/** Segundos en que algo cambia a la vista dentro de la escena (además de su inicio). */
	cambios_s: z.array(segundos).default([]),
	/** Segundos (desde el inicio de la escena) en que un destello suave de color marca un cambio, sin cortar la escena. */
	pulsos_s: z.array(segundos).default([]),
	/** 0–1: cuántas brasas flotan. */
	brasas: z.number().min(0).max(1),
	/** Pieza cuya paleta pinta el fondo (por defecto, la de la escena). */
	fondo: z.string().min(1).optional(),
});

export const Galeria = z.object({
	version: z.literal(1),
	tema: z.string().min(1),
	duracion_s: z.number().positive().max(60),
	lienzo: z.object({w: z.literal(1080), h: z.literal(1920), fps: z.literal(30)}),
	piezas: z.array(Pieza).min(1),
	escenas: z.array(Escena).min(1),
});

export type GaleriaEdl = z.infer<typeof Galeria>;
export type EscenaEdl = z.infer<typeof Escena>;
export type PiezaEdl = z.infer<typeof Pieza>;
export type TextoEdl = z.infer<typeof Texto>;

export const aCuadro = (s: number): number => Math.round(s * FPS);
export const textoPlano = (t: TextoEdl): string[] => t.lineas.map((l) => l.map((p) => p.t).join(''));

// ───────────────────────── validación ─────────────────────────

export type Estado = 'PASA' | 'FALLA' | 'N/A';
export type Check = {regla: string; estado: Estado; detalle: string};

/** Palabras que el encargo prohíbe o que serían un dato inventado (precios, plazos, descuentos, stock, jerga técnica). */
const PROHIBIDO = /\bDTF\b|impresi[oó]n digital|env[ií]o|gratis|descuento|stock|oferta|plazo|\d\s?%/i;
export const PRECIO_PERMITIDO = '$14.000';
const CLAVES_DEL_ENCARGO = ['SHIBUYA', 'CAOS', 'ELIGE', 'DM'] as const;
const MAX_ENTRE_CAMBIOS_S = 1.5;

export function validarGaleria(g: GaleriaEdl): Check[] {
	const checks: Check[] = [];
	const ok = (regla: string, cumple: boolean, detalle: string) => checks.push({regla, estado: cumple ? 'PASA' : 'FALLA', detalle});
	const f = (s: number) => aCuadro(s);
	const esc = g.escenas;
	const porId = new Map(g.piezas.map((p) => [p.id, p]));

	// 1. Duración y escenas contiguas.
	ok('Duración ~15 s', Math.abs(g.duracion_s - 15) <= 0.1, `dura ${g.duracion_s} s`);
	const huecos: string[] = [];
	if (f(esc[0].desde) !== 0) huecos.push(`la primera escena arranca en ${esc[0].desde} s`);
	esc.forEach((e, i) => {
		if (!(e.desde < e.hasta)) huecos.push(`${e.id}: desde ≥ hasta`);
		if (i > 0 && f(e.desde) !== f(esc[i - 1].hasta)) huecos.push(`hueco o traslape entre ${esc[i - 1].id} y ${e.id}`);
	});
	if (f(esc[esc.length - 1].hasta) !== f(g.duracion_s)) huecos.push(`la última escena termina en ${esc[esc.length - 1].hasta} s y el video dura ${g.duracion_s} s`);
	ok('Escenas contiguas, de 0 a la duración', huecos.length === 0, huecos.join('; ') || `${esc.length} escenas sin huecos`);

	// 2. Referencias a piezas.
	const sueltas = esc.filter((e) => e.pieza !== null && !porId.has(e.pieza)).map((e) => `${e.id} → ${e.pieza}`);
	const sinPieza = esc.filter((e) => (e.tipo === 'entera' || e.tipo === 'detalle' || e.tipo === 'seleccion' || e.tipo === 'cierre') && e.pieza === null).map((e) => e.id);
	ok('Cada escena apunta a una pieza que existe', sueltas.length === 0 && sinPieza.length === 0, [...sueltas, ...sinPieza.map((i) => `${i}: falta la pieza`)].join('; ') || 'todas');

	// 3. Titular en el primer cuadro.
	const primera = esc[0];
	const lineas1 = primera.texto ? textoPlano(primera.texto) : [];
	const palabras1 = lineas1.join(' ').split(/\s+/).filter(Boolean).length;
	ok('El primer cuadro lleva el titular (2 líneas, máx. 6 palabras)', primera.texto !== null && lineas1.length === 2 && palabras1 <= 6, primera.texto ? `${lineas1.length} líneas, ${palabras1} palabras` : 'la primera escena no trae texto');

	// 4. Algo cambia cada 1–1,5 s.
	const eventos = [...new Set([...esc.flatMap((e) => [e.desde, ...e.cambios_s.map((c) => e.desde + c), ...e.pulsos_s.map((c) => e.desde + c)]), g.duracion_s])].sort((a, b) => a - b);
	let peor = 0;
	let dondePeor = 0;
	for (let i = 1; i < eventos.length; i++) {
		const d = eventos[i] - eventos[i - 1];
		if (d > peor) {
			peor = d;
			dondePeor = eventos[i - 1];
		}
	}
	ok(`Algo cambia a la vista cada ≤ ${MAX_ENTRE_CAMBIOS_S} s`, peor <= MAX_ENTRE_CAMBIOS_S + 1 / FPS, `el tramo más largo sin cambio dura ${peor.toFixed(2)} s (desde ${dondePeor.toFixed(2)} s); ${eventos.length - 1} cambios en total`);

	// 5. Cada pieza: entera, de cerca y en la grilla.
	const grilla = esc.find((e) => e.tipo === 'grilla');
	for (const p of g.piezas) {
		const entera = esc.some((e) => e.pieza === p.id && (e.tipo === 'entera' || e.tipo === 'seleccion' || e.tipo === 'cierre'));
		const cerca = esc.some((e) => e.pieza === p.id && (e.tipo === 'detalle' || e.tipo === 'seleccion'));
		ok(`«${p.nombre}» aparece entera, de cerca y en la grilla`, entera && cerca && grilla !== undefined, `entera: ${entera ? 'sí' : 'NO'} · de cerca: ${cerca ? 'sí' : 'NO'} · grilla: ${grilla ? 'sí' : 'NO'}`);
	}

	// 6. Texto: máximo 2 a la vez, rótulos de 1 línea salvo el titular, zona segura.
	const excesos: string[] = [];
	const fuera: string[] = [];
	const lineasLargas: string[] = [];
	esc.forEach((e, i) => {
		const n = (e.texto ? 1 : 0) + (e.chip ? 1 : 0) + (e.boton ? 1 : 0);
		if (n > 2) excesos.push(`${e.id}: ${n} textos`);
		if (e.texto && i > 0 && e.texto.lineas.length > 1) lineasLargas.push(`${e.id}: ${e.texto.lineas.length} líneas`);
		if (e.texto) {
			const c = cajaRotulo(textoPlano(e.texto));
			if (c.arriba < SEGURA.arriba || c.abajo > SEGURA.abajo) fuera.push(`${e.id}: rótulo en y ${Math.round(c.arriba)}–${Math.round(c.abajo)}`);
		}
		if (e.chip && (CHIP.cy - CHIP.h / 2 < SEGURA.arriba || CHIP.cy + CHIP.h / 2 > SEGURA.abajo)) fuera.push(`${e.id}: píldora fuera`);
		if (e.boton && (BOTON.cy - BOTON.h / 2 < SEGURA.arriba || BOTON.cy + BOTON.h / 2 > SEGURA.abajo)) fuera.push(`${e.id}: botón fuera`);
	});
	ok('Máximo 2 textos a la vez', excesos.length === 0, excesos.join('; ') || 'ninguna escena pasa de 2');
	ok('Rótulos de 1 línea (el titular, de 2)', lineasLargas.length === 0, lineasLargas.join('; ') || 'todos de 1 línea');
	ok(`Texto dentro de la zona segura (y ${SEGURA.arriba}–${SEGURA.abajo})`, fuera.length === 0, fuera.join('; ') || 'todos dentro');

	// 7. Palabras clave en color.
	const claves = new Set(esc.flatMap((e) => (e.texto ? e.texto.lineas.flat().filter((p) => p.clave).map((p) => p.t.trim().toUpperCase()) : [])));
	const faltan = CLAVES_DEL_ENCARGO.filter((k) => !claves.has(k));
	ok(`Palabras en color: ${CLAVES_DEL_ENCARGO.join(' · ')}`, faltan.length === 0, faltan.length ? `faltan: ${faltan.join(', ')}` : 'todas');

	// 8. Un solo cierre con botón en los últimos 2–3 s.
	const conBoton = esc.filter((e) => e.boton);
	const durBoton = conBoton.reduce((s, e) => s + (e.hasta - e.desde), 0);
	const tempranos = conBoton.filter((e) => e.desde < g.duracion_s - 3 - 1e-6).map((e) => e.id);
	ok('Un solo cierre con botón durante los últimos 2–3 s', conBoton.length === 1 && tempranos.length === 0 && durBoton >= 2 - 1e-6 && durBoton <= 3 + 1e-6, `${conBoton.length} escena(s) con botón, ${durBoton.toFixed(1)} s`);

	// 9. Nada inventado: precio y términos.
	const todo = esc.flatMap((e) => [...(e.texto ? textoPlano(e.texto) : []), e.chip ?? '', e.boton ?? '']);
	const precios = [...todo.join(' ').matchAll(/\$\s?[\d.,]+/g)].map((m) => m[0].replace(/\s/g, ''));
	const malos = precios.filter((p) => p !== PRECIO_PERMITIDO);
	const vedados = todo.filter((t) => PROHIBIDO.test(t));
	ok(`Solo el precio del encargo (${PRECIO_PERMITIDO}) y nada prohibido`, malos.length === 0 && vedados.length === 0 && precios.length > 0, `precios: ${precios.join(', ') || 'ninguno'}${vedados.length ? ` · prohibido: ${vedados.join(' | ')}` : ''}`);

	// 10. Detalle dentro de la imagen.
	const salidos: string[] = [];
	for (const e of esc.filter((x) => x.tipo === 'detalle')) {
		const p = e.pieza ? porId.get(e.pieza) : undefined;
		if (!p) continue;
		const [w, h] = p.dim;
		const pan = e.camara.pan ?? [0, 0, 0, 0];
		for (const [z, dx, dy] of [[e.camara.zoom[0], pan[0], pan[1]], [e.camara.zoom[1], pan[2], pan[3]]] as const) {
			const vw = p.detalle.ancho / z;
			const vh = (vw * 1040) / 920;
			const x0 = p.detalle.cx + dx - vw / 2;
			const y0 = p.detalle.cy + dy - vh / 2;
			if (x0 < 0 || y0 < 0 || x0 + vw > w || y0 + vh > h) salidos.push(`${e.id}: la ventana (${Math.round(x0)},${Math.round(y0)} ${Math.round(vw)}×${Math.round(vh)}) se sale de ${w}×${h}`);
		}
	}
	ok('Los planos de detalle no se salen de la imagen', salidos.length === 0, salidos.join('; ') || 'todos dentro');

	// 11. Fondos y brasas.
	const brasas = esc.filter((e) => e.brasas > 0).length;
	ok('Brasas rojas flotando (≥ la mitad de las escenas)', brasas >= esc.length / 2, `${brasas} de ${esc.length} escenas`);
	return checks;
}

/** "Cumple X de Y checks (Z N/A)". */
export function resumen(checks: readonly Check[]): string {
	const aplican = checks.filter((c) => c.estado !== 'N/A');
	const pasan = aplican.filter((c) => c.estado === 'PASA').length;
	return `cumple ${pasan} de ${aplican.length} checks (${checks.length - aplican.length} N/A)`;
}
