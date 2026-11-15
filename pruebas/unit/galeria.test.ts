// Copyright (c) 2026 Enrique Rocha (@soyenriquerocha)
// SPDX-License-Identifier: MIT
import {describe, expect, it} from 'vitest';
import {Galeria, resumen, validarGaleria, type GaleriaEdl} from '../../src/galeria/esquema';
import {cajaRotulo, tamanoRotulo} from '../../src/galeria/layout';
import {posicionCursor} from '../../src/galeria/Galeria';

const pieza = (id: string) => ({
	id,
	nombre: `Pieza ${id}`,
	prenda: 'polera',
	recorte: `p/x/${id}.png`,
	original_2x: `p/x/${id}-2x.jpg`,
	recorte_dim: [1000, 1200] as [number, number],
	dim: [1400, 1500] as [number, number],
	detalle: {cx: 700, cy: 750, ancho: 700},
	estampado: {x: 0.5, y: 0.5},
	paleta: {a: '#000000', b: '#111111', brillo: '#ff0000'},
});

const base = (): GaleriaEdl => {
	const t = (partes: Array<{t: string; clave?: 'rojo' | 'naranja' | 'amarillo'}>) => ({lineas: [partes], entrada: 'pop' as const, continua: false});
	const e = (id: string, desde: number, hasta: number, tipo: GaleriaEdl['escenas'][number]['tipo'], p: string | null, extra: Partial<GaleriaEdl['escenas'][number]> = {}) => ({
		id, desde, hasta, tipo, pieza: p, entrada: 'corte' as const, flash: null, camara: {zoom: [1, 1] as [number, number]}, texto: null, chip: null, boton: null, cambios_s: [], pulsos_s: [], brasas: 1, ...extra,
	});
	return Galeria.parse({
		version: 1, tema: 'x', duracion_s: 15, lienzo: {w: 1080, h: 1920, fps: 30},
		piezas: [pieza('a'), pieza('b')],
		escenas: [
			e('1', 0, 1.5, 'entera', 'a', {texto: {lineas: [[{t: 'SHIBUYA ', clave: 'rojo'}, {t: 'CAYÓ'}], [{t: '¿CUÁL LLEVAS TÚ?'}]], entrada: 'pop'}}),
			e('2', 1.5, 3, 'detalle', 'b', {texto: t([{t: 'EL '}, {t: 'CAOS', clave: 'naranja'}]), camara: {zoom: [1, 1.2]}}),
			e('3', 3, 4.5, 'entera', 'b', {texto: t([{t: 'DESDE $14.000'}])}),
			e('4', 4.5, 6, 'grilla', null, {texto: t([{t: 'ELIGE', clave: 'naranja'}]), cambios_s: [0.75]}),
			e('5', 6, 7.5, 'seleccion', 'a', {cambios_s: [0.7]}),
			e('6', 7.5, 13, 'entera', 'a', {cambios_s: [1.4, 2.8, 4.2]}),
			e('7', 13, 15, 'cierre', 'a', {texto: t([{t: 'PÍDELA POR '}, {t: 'DM', clave: 'amarillo'}]), boton: 'ESCRÍBENOS AHORA →', cambios_s: [1]}),
		],
	});
};

describe('galería: validación del guion', () => {
	it('un guion correcto pasa todos los checks', () => {
		const checks = validarGaleria(base());
		expect(checks.filter((c) => c.estado === 'FALLA')).toEqual([]);
		expect(resumen(checks)).toMatch(/^cumple (\d+) de \1 checks \(0 N\/A\)$/);
	});

	it('falla si hay un hueco entre escenas', () => {
		const g = base();
		g.escenas[1].desde = 1.7;
		expect(validarGaleria(g).find((c) => c.regla.startsWith('Escenas contiguas'))?.estado).toBe('FALLA');
	});

	it('falla si pasan más de 1,5 s sin ningún cambio', () => {
		const g = base();
		g.escenas[5].cambios_s = [];
		expect(validarGaleria(g).find((c) => c.regla.startsWith('Algo cambia'))?.estado).toBe('FALLA');
	});

	it('falla si aparece un precio distinto al del encargo o una palabra prohibida', () => {
		const g = base();
		g.escenas[2].texto!.lineas[0][0].t = 'DESDE $9.990';
		expect(validarGaleria(g).find((c) => c.regla.startsWith('Solo el precio'))?.estado).toBe('FALLA');
		const h = base();
		h.escenas[1].texto!.lineas[0][0].t = 'ENVÍO GRATIS ';
		expect(validarGaleria(h).find((c) => c.regla.startsWith('Solo el precio'))?.estado).toBe('FALLA');
	});

	it('falla si una pieza no aparece de cerca', () => {
		const g = base();
		g.escenas[1].tipo = 'entera';
		expect(validarGaleria(g).some((c) => c.estado === 'FALLA' && c.regla.includes('Pieza b'))).toBe(true);
	});

	it('falla si el botón sale antes de los últimos 3 s o hay 3 textos a la vez', () => {
		const g = base();
		g.escenas[2].boton = 'HOLA';
		expect(validarGaleria(g).find((c) => c.regla.startsWith('Un solo cierre'))?.estado).toBe('FALLA');
		const h = base();
		h.escenas[2].chip = 'X';
		h.escenas[2].boton = 'Y';
		expect(validarGaleria(h).find((c) => c.regla.startsWith('Máximo 2 textos'))?.estado).toBe('FALLA');
	});

	it('falla si un plano de detalle se sale de la imagen', () => {
		const g = base();
		g.escenas[1].camara = {zoom: [1, 1], pan: [0, 0, 0, 900]};
		expect(validarGaleria(g).find((c) => c.regla.startsWith('Los planos de detalle'))?.estado).toBe('FALLA');
	});
});

describe('galería: medidas', () => {
	it('el titular de 2 líneas cabe en la zona segura', () => {
		const c = cajaRotulo(['SHIBUYA CAYÓ', '¿CUÁL LLEVAS TÚ?']);
		expect(c.arriba).toBeGreaterThanOrEqual(288);
		expect(c.abajo).toBeLessThanOrEqual(1600);
	});

	it('un rótulo largo achica la letra para caber en 940 px', () => {
		expect(tamanoRotulo(['INCIDENTE DE SHIBUYA'])).toBeLessThan(tamanoRotulo(['ELIGE EL TUYO']));
	});

	it('el cursor arranca fuera de las casillas, pasa por las 4 y termina sobre la elegida', () => {
		expect(posicionCursor(0, 0).opacidad).toBe(0);
		const fin = posicionCursor(70, 0);
		const inicio = posicionCursor(5, 0);
		expect(fin.x).toBeLessThan(inicio.x);
		expect(fin.opacidad).toBe(1);
	});
});
