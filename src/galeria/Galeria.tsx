// Copyright (c) 2026 Enrique Rocha (@soyenriquerocha)
// SPDX-License-Identifier: MIT
import React from 'react';
import {AbsoluteFill, Img, Sequence, random, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {limitar, mezclar, salidaCubica, suaveSeno} from '../estilo/animaciones';
import {aCuadro, type EscenaEdl, type GaleriaEdl, type PiezaEdl, type TextoEdl} from './esquema';
import {ALTO, ANCHO, BOTON, CHIP, COLORES_CLAVE, PRENDA_CON_PIE, PRENDA_LIBRE, TARJETA, TEXTO, tamanoRotulo, tileDe} from './layout';

/**
 * Composición "Galeria": reel de producto armado solo con imágenes (recortes de prenda, planos de detalle, grilla con cursor,
 * brasas, rótulos animados y botón de cierre). Capas, de abajo hacia arriba: fondo con brasas (a nivel raíz, por escena) →
 * imagen de la escena → destello de color → rótulo, píldora de precio y botón. Todo sale de galeria-vN.json (src/galeria/esquema.ts).
 * Solo corte directo, zoom o desenfoque: ninguna transición de plantilla.
 */

const FAMILIA = 'Galeria Anton';
let fuenteCargada = false;
const cargarFuente = () => {
	if (fuenteCargada) return;
	fuenteCargada = true;
	void loadFont({family: FAMILIA, url: staticFile('biblioteca/fuentes/anton/Anton-Regular.ttf'), weight: '400', style: 'normal', display: 'block'});
};

// ───────────────────────── fondo y brasas ─────────────────────────

const COLORES_BRASA = ['#FF3B1F', '#FF7A1A', '#FFB02E', '#FF5A36'];

const Brasas: React.FC<{f: number; nivel: number}> = ({f, nivel}) => {
	const N = 60;
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{Array.from({length: N}, (_, i) => {
				if (i / N >= nivel) return null;
				const rx = random(`bx${i}`);
				const rv = random(`bv${i}`);
				const rs = random(`bs${i}`);
				const ro = random(`bo${i}`);
				const rp = random(`bp${i}`);
				const vel = 1.1 + rv * 3.4;
				const tam = 3 + rs * 8;
				const recorrido = ALTO + 240;
				const y = ALTO + 120 - ((f * vel + ro * recorrido) % recorrido);
				const x = rx * ANCHO + Math.sin((f + rp * 100) / 18) * (16 + rs * 30);
				const parpadeo = 0.55 + 0.45 * Math.sin(f / 5 + rp * 20);
				const arriba = limitar(y / 360, 0, 1);
				const color = COLORES_BRASA[i % COLORES_BRASA.length];
				return <div key={i} style={{position: 'absolute', left: x, top: y, width: tam, height: tam, borderRadius: '50%', background: color, opacity: parpadeo * arriba * 0.92, boxShadow: `0 0 ${tam * 2.5}px ${tam}px ${color}88`, filter: rs > 0.62 ? 'blur(1.6px)' : undefined}} />;
			})}
		</AbsoluteFill>
	);
};

const Fondo: React.FC<{pieza: PiezaEdl; f: number; brasas: number}> = ({pieza, f, brasas}) => {
	const p = pieza.paleta;
	const deriva = Math.sin(f / 45) * 50;
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{background: `linear-gradient(180deg, ${p.a} 0%, ${p.b} 100%)`}} />
			<div style={{position: 'absolute', left: -260 + deriva, top: 260, width: 980, height: 980, borderRadius: '50%', background: `radial-gradient(circle, ${p.brillo}AA 0%, transparent 66%)`, filter: 'blur(46px)'}} />
			<div style={{position: 'absolute', left: 380 - deriva, top: 980, width: 940, height: 940, borderRadius: '50%', background: 'radial-gradient(circle, #6A1FB8AA 0%, transparent 66%)', filter: 'blur(50px)'}} />
			<Brasas f={f} nivel={brasas} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0,0,0,0.6) 100%)'}} />
		</AbsoluteFill>
	);
};

// ───────────────────────── prenda entera ─────────────────────────

type Caja = {x0: number; x1: number; y0: number; y1: number};

const Resplandor: React.FC<{caja: Caja; pieza: PiezaEdl; f: number; fuerza?: number; escala?: number}> = ({caja, pieza, f, fuerza = 1, escala = 1}) => {
	const cx = (caja.x0 + caja.x1) / 2;
	const cy = (caja.y0 + caja.y1) / 2;
	const pulso = 0.8 + 0.2 * Math.sin(f / 8);
	const d = 1000 * escala;
	return <div style={{position: 'absolute', left: cx - d / 2, top: cy - d / 2, width: d, height: d, borderRadius: '50%', background: `radial-gradient(circle, ${pieza.paleta.brillo}CC 0%, ${pieza.paleta.brillo}00 62%)`, opacity: 0.7 * pulso * fuerza}} />;
};

const PrendaEntera: React.FC<{pieza: PiezaEdl; e: EscenaEdl; f: number; dur: number; caja: Caja}> = ({pieza, e, f, dur, caja}) => {
	const s = mezclar(e.camara.zoom[0], e.camara.zoom[1], suaveSeno(f / dur));
	const te = salidaCubica(f / 9);
	const desenfoque = e.entrada === 'desenfoque' ? 14 * (1 - te) : 0;
	const extra = e.entrada === 'desenfoque' ? 1.1 - 0.1 * te : 1;
	const [w, h] = pieza.recorte_dim;
	const k = Math.min((caja.x1 - caja.x0) / w, (caja.y1 - caja.y0) / h);
	const cx = (caja.x0 + caja.x1) / 2;
	const cy = (caja.y0 + caja.y1) / 2;
	return (
		<>
			<Resplandor caja={caja} pieza={pieza} f={f} />
			<div style={{position: 'absolute', left: cx - (w * k) / 2, top: cy - (h * k) / 2, width: w * k, height: h * k, transform: `scale(${s * extra})`, transformOrigin: `${pieza.estampado.x * 100}% ${pieza.estampado.y * 100}%`, filter: `blur(${desenfoque}px) drop-shadow(0 34px 40px rgba(0,0,0,0.65))`}}>
				<Img src={staticFile(pieza.recorte)} style={{width: '100%', height: '100%', display: 'block'}} />
			</div>
		</>
	);
};

// ───────────────────────── plano de detalle ─────────────────────────

const Detalle: React.FC<{pieza: PiezaEdl; e: EscenaEdl; f: number; dur: number}> = ({pieza, e, f, dur}) => {
	const rapido = e.entrada === 'zoom-corte';
	const t = rapido ? salidaCubica(f / dur) : suaveSeno(f / dur);
	const z = mezclar(e.camara.zoom[0], e.camara.zoom[1], t);
	const pan = e.camara.pan ?? [0, 0, 0, 0];
	const cxo = pieza.detalle.cx + mezclar(pan[0], pan[2], t);
	const cyo = pieza.detalle.cy + mezclar(pan[1], pan[3], t);
	const k = TARJETA.w / (pieza.detalle.ancho / z);
	const te = salidaCubica(f / 8);
	const desenfoque = e.entrada === 'desenfoque' ? 22 * (1 - te) : 0;
	const caja: Caja = {x0: TARJETA.cx - TARJETA.w / 2, x1: TARJETA.cx + TARJETA.w / 2, y0: TARJETA.cy - TARJETA.h / 2, y1: TARJETA.cy + TARJETA.h / 2};
	return (
		<>
			<Resplandor caja={caja} pieza={pieza} f={f} fuerza={0.9} escala={1.15} />
			<div style={{position: 'absolute', left: caja.x0, top: caja.y0, width: TARJETA.w, height: TARJETA.h, borderRadius: TARJETA.radio, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 3px rgba(255,255,255,0.16)', filter: desenfoque ? `blur(${desenfoque}px)` : undefined}}>
				<Img src={staticFile(pieza.original_2x)} style={{position: 'absolute', maxWidth: 'none', width: pieza.dim[0] * k, height: pieza.dim[1] * k, left: TARJETA.w / 2 - cxo * k, top: TARJETA.h / 2 - cyo * k}} />
				<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.38) 100%)'}} />
			</div>
		</>
	);
};

// ───────────────────────── grilla "elige el tuyo" + selección ─────────────────────────

const HOVER_ORDEN = [3, 2, 1, 0];
const HOVER_CUADROS = [22, 36, 50, 64];
const CLIC_CUADRO = 68;
const SELECCION_CUADRO = 75;

const centroTile = (i: number) => {
	const t = tileDe(i);
	return {x: t.x + t.w / 2, y: t.y + t.h / 2 + 14};
};

/** Posición del cursor en el cuadro `f` de la grilla (cuadros desde que arranca "elige el tuyo"). */
export function posicionCursor(f: number, destino: number): {x: number; y: number; opacidad: number} {
	const inicio = {x: 960, y: 1570};
	const puntos = [{f: 4, ...inicio}, ...HOVER_ORDEN.slice(0, -1).map((idx, i) => ({f: HOVER_CUADROS[i], ...centroTile(idx)})), {f: HOVER_CUADROS[HOVER_CUADROS.length - 1], ...centroTile(destino)}];
	let p = puntos[0];
	let q = puntos[0];
	if (f >= puntos[puntos.length - 1].f) {
		p = q = puntos[puntos.length - 1];
	} else if (f > puntos[0].f) {
		const i = puntos.findIndex((x) => x.f > f);
		p = puntos[i - 1];
		q = puntos[i];
	}
	const u = q.f === p.f ? 1 : suaveSeno((f - p.f) / (q.f - p.f));
	const opacidad = limitar((f - 2) / 4, 0, 1) * (1 - limitar((f - 80) / 7, 0, 1));
	return {x: mezclar(p.x, q.x, u), y: mezclar(p.y, q.y, u), opacidad};
}

const Cursor: React.FC<{f: number; destino: number}> = ({f, destino}) => {
	const c = posicionCursor(f, destino);
	const presion = f >= CLIC_CUADRO && f < CLIC_CUADRO + 4 ? 0.86 : 1;
	const r = limitar((f - CLIC_CUADRO) / 12, 0, 1);
	return (
		<>
			{r > 0 && r < 1 && <div style={{position: 'absolute', left: c.x - 110 * r, top: c.y - 110 * r, width: 220 * r, height: 220 * r, borderRadius: '50%', border: '6px solid #FF2D46', opacity: 1 - r, boxShadow: '0 0 30px #FF2D46'}} />}
			<svg width={78} height={78} viewBox="0 0 24 24" style={{position: 'absolute', left: c.x - 16, top: c.y - 9, opacity: c.opacidad, transform: `scale(${presion})`, transformOrigin: '16px 9px', filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.55))'}}>
				<path d="M5 3l14 8-6.2 1.6L16 20l-3 1.3-3.2-7.6L5 17z" fill="#fff" stroke="#000" strokeWidth={1.3} strokeLinejoin="round" />
			</svg>
		</>
	);
};

const GrillaSeleccion: React.FC<{g: GaleriaEdl; fG: number; elegida: number}> = ({g, fG, elegida}) => {
	const cursor = posicionCursor(fG, elegida);
	const sel = limitar((fG - CLIC_CUADRO) / 6, 0, 1);
	const t2 = salidaCubica((fG - SELECCION_CUADRO) / 14);
	const fHero = fG - SELECCION_CUADRO;
	const push = suaveSeno((fHero - 37) / 38);
	const piezas = g.piezas.slice(0, 4);
	const hero = {x0: PRENDA_CON_PIE.x0, x1: PRENDA_CON_PIE.x1, y0: PRENDA_CON_PIE.y0, y1: PRENDA_CON_PIE.y1};
	return (
		<>
			{t2 > 0 && <Resplandor caja={hero} pieza={piezas[elegida]} f={fG} fuerza={t2} escala={1.05 + 0.25 * push} />}
			{piezas.map((p, i) => {
				const tile = tileDe(i);
				const esElegida = i === elegida;
				const entrada = limitar((fG - i * 4) / 6, 0, 1);
				const centro = centroTile(i);
				const dist = Math.hypot(cursor.x - centro.x, cursor.y - centro.y);
				const hover = fG < SELECCION_CUADRO ? limitar(1 - dist / 300, 0, 1) * cursor.opacidad : 0;
				const resalte = Math.max(hover, esElegida ? sel : 0);
				if (!esElegida && t2 >= 1) return null;
				const oscuro = esElegida ? 1 : 1 - 0.65 * limitar(t2 / 0.5, 0, 1);
				const opacidad = (esElegida ? 1 : 1 - limitar((t2 - 0.4) / 0.6, 0, 1)) * Math.min(1, entrada * 1.6);
				// La elegida pasa de su casilla a la zona grande de la prenda.
				const u = esElegida ? t2 : 0;
				const x = mezclar(tile.x, hero.x0, u);
				const y = mezclar(tile.y, hero.y0, u);
				const w = mezclar(tile.w, hero.x1 - hero.x0, u);
				const h = mezclar(tile.h, hero.y1 - hero.y0, u);
				const pad = mezclar(30, 0, u);
				const escala = mezclar(0.6, 1, entrada) * (1 + 0.06 * resalte) * (esElegida ? 1 + 0.5 * push : 1);
				const origen = esElegida && u >= 1 ? `${p.estampado.x * 100}% ${p.estampado.y * 100}%` : '50% 50%';
				return (
					<div key={p.id} style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `scale(${escala})`, transformOrigin: origen, opacity: opacidad, filter: `brightness(${oscuro})${esElegida || t2 < 0.01 ? '' : ` blur(${6 * t2}px)`}`}}>
						<div style={{position: 'absolute', inset: 0, borderRadius: mezclar(36, 0, u), background: `linear-gradient(160deg, ${p.paleta.b}, ${p.paleta.a})`, opacity: 1 - u, boxShadow: `0 24px 50px rgba(0,0,0,0.55), 0 0 0 ${3 + 3 * resalte}px ${resalte > 0.05 ? `rgba(255,45,70,${0.25 + 0.75 * resalte})` : 'rgba(255,255,255,0.14)'}, 0 0 ${60 * resalte}px ${p.paleta.brillo}`}} />
						<Img src={staticFile(p.recorte)} style={{position: 'absolute', left: pad, top: pad, width: w - 2 * pad, height: h - 2 * pad, objectFit: 'contain', filter: u > 0.5 ? 'drop-shadow(0 34px 40px rgba(0,0,0,0.65))' : 'drop-shadow(0 12px 14px rgba(0,0,0,0.5))'}} />
					</div>
				);
			})}
			<Cursor f={fG} destino={elegida} />
		</>
	);
};

// ───────────────────────── texto, píldora y botón ─────────────────────────

const CONTORNO = (() => {
	const r = 7;
	const sombras: string[] = [];
	for (let i = 0; i < 16; i++) {
		const a = (i / 16) * Math.PI * 2;
		sombras.push(`${(Math.cos(a) * r).toFixed(1)}px ${(Math.sin(a) * r).toFixed(1)}px 0 #000`);
	}
	return `${sombras.join(', ')}, 0 12px 0 rgba(0,0,0,0.5), 0 0 44px rgba(0,0,0,0.7)`;
})();

const Rotulo: React.FC<{texto: TextoEdl; f: number; primerCuadro: boolean}> = ({texto, f, primerCuadro}) => {
	const plano = texto.lineas.map((l) => l.map((p) => p.t).join(''));
	const tam = tamanoRotulo(plano);
	const fa = texto.continua ? 999 : f;
	let escala = 1;
	let dy = 0;
	let opacidad = 1;
	if (texto.entrada === 'pop') {
		escala = fa < 4 ? mezclar(primerCuadro ? 0.9 : 0.82, 1.08, salidaCubica(fa / 4)) : fa < 8 ? mezclar(1.08, 1, suaveSeno((fa - 4) / 4)) : 1;
		opacidad = primerCuadro ? 1 : limitar((fa + 1) / 3, 0, 1);
	} else {
		dy = 70 * (1 - salidaCubica(fa / 7));
		opacidad = primerCuadro ? 1 : limitar((fa + 1) / 4, 0, 1);
	}
	return (
		<div style={{position: 'absolute', left: 0, width: ANCHO, top: TEXTO.centroY, transform: `translateY(calc(-50% + ${dy}px)) scale(${escala})`, opacity: opacidad, textAlign: 'center', fontFamily: `'${FAMILIA}', Impact, sans-serif`, fontSize: tam, lineHeight: TEXTO.interlinea, letterSpacing: 2, color: '#fff', textShadow: CONTORNO, whiteSpace: 'pre'}}>
			{texto.lineas.map((linea, i) => (
				<div key={i}>
					{linea.map((parte, j) => (
						<span key={j} style={{color: parte.clave ? COLORES_CLAVE[parte.clave] : '#fff'}}>
							{parte.t}
						</span>
					))}
				</div>
			))}
		</div>
	);
};

const Pildora: React.FC<{texto: string; f: number}> = ({texto, f}) => {
	const a = limitar((f - 8) / 6, 0, 1);
	const escala = mezclar(0.5, 1, a);
	return (
		<div style={{position: 'absolute', left: CHIP.cx - CHIP.w / 2, top: CHIP.cy - CHIP.h / 2, width: CHIP.w, height: CHIP.h, borderRadius: CHIP.h / 2, background: 'linear-gradient(90deg, #FFD400, #FF8A1F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: `'${FAMILIA}', Impact, sans-serif`, fontSize: 58, letterSpacing: 2, color: '#1A0508', boxShadow: '0 14px 34px rgba(0,0,0,0.55), 0 0 40px rgba(255,138,31,0.55)', transform: `scale(${escala})`, opacity: Math.min(1, a * 1.8)}}>
			{texto}
		</div>
	);
};

const Boton: React.FC<{texto: string; f: number}> = ({texto, f}) => {
	const flecha = texto.trim().endsWith('→');
	const etiqueta = flecha ? texto.trim().slice(0, -1).trim() : texto;
	const u = limitar((f - 10) / 9, 0, 1);
	const entrada = u < 0.6 ? mezclar(0.6, 1.1, salidaCubica(u / 0.6)) : mezclar(1.1, 1, suaveSeno((u - 0.6) / 0.4));
	const pulso = f > 19 ? 1 + 0.025 * Math.sin((f - 19) / 4.5) : 1;
	const brillo = 0.5 + 0.5 * Math.sin((f - 19) / 4.5);
	return (
		<div style={{position: 'absolute', left: BOTON.cx - BOTON.w / 2, top: BOTON.cy - BOTON.h / 2, width: BOTON.w, height: BOTON.h, borderRadius: BOTON.h / 2, background: 'linear-gradient(180deg, #FF3550, #C1121F)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, fontFamily: `'${FAMILIA}', Impact, sans-serif`, fontSize: 66, letterSpacing: 2, color: '#fff', boxShadow: `0 16px 40px rgba(0,0,0,0.6), 0 0 ${40 + 40 * brillo}px rgba(255,45,70,${0.55 + 0.3 * brillo}), inset 0 3px 0 rgba(255,255,255,0.35)`, transform: `scale(${entrada * pulso})`, opacity: Math.min(1, u * 3)}}>
			<span>{etiqueta}</span>
			{flecha && (
				<svg width={70} height={56} viewBox="0 0 70 56">
					<path d="M4 28h56M38 8l22 20-22 20" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			)}
		</div>
	);
};

const Destello: React.FC<{color: 'rojo' | 'violeta'; f: number; fuerza?: number}> = ({color, f, fuerza = 0.85}) => {
	if (f < 0) return null;
	const a = limitar(1 - f / 7, 0, 1);
	if (a <= 0) return null;
	return <AbsoluteFill style={{background: color === 'rojo' ? '#FF1E3C' : '#8A2BFF', opacity: fuerza * a * a, mixBlendMode: 'screen'}} />;
};

// ───────────────────────── escena y composición ─────────────────────────

const EscenaVista: React.FC<{g: GaleriaEdl; e: EscenaEdl; indice: number}> = ({g, e, indice}) => {
	// Dentro de su Sequence, useCurrentFrame() = cuadros desde que entra la escena.
	const f = useCurrentFrame();
	const dur = Math.max(1, aCuadro(e.hasta) - aCuadro(e.desde));
	const pieza = g.piezas.find((p) => p.id === e.pieza);
	const grilla = g.escenas.find((x) => x.tipo === 'grilla');
	const seleccion = g.escenas.find((x) => x.tipo === 'seleccion');
	const elegida = Math.max(0, g.piezas.findIndex((p) => p.id === seleccion?.pieza));
	const conPie = Boolean(e.chip || e.boton);
	let visual: React.ReactNode = null;
	if ((e.tipo === 'entera' || e.tipo === 'cierre') && pieza) {
		visual = <PrendaEntera pieza={pieza} e={e} f={f} dur={dur} caja={conPie ? PRENDA_CON_PIE : PRENDA_LIBRE} />;
	} else if (e.tipo === 'detalle' && pieza) {
		visual = <Detalle pieza={pieza} e={e} f={f} dur={dur} />;
	} else if (e.tipo === 'grilla' || e.tipo === 'seleccion') {
		const offset = e.tipo === 'seleccion' && grilla ? aCuadro(e.desde) - aCuadro(grilla.desde) : 0;
		visual = <GrillaSeleccion g={g} fG={f + offset} elegida={elegida} />;
	}
	return (
		<AbsoluteFill>
			{visual}
			{e.flash && <Destello color={e.flash} f={f} fuerza={indice === 0 ? 0.42 : 0.85} />}
			{e.pulsos_s.map((t) => (
				<Destello key={t} color={e.flash ?? 'rojo'} f={f - aCuadro(t)} fuerza={0.4} />
			))}
			{e.texto && <Rotulo texto={e.texto} f={f} primerCuadro={indice === 0} />}
			{e.chip && <Pildora texto={e.chip} f={f} />}
			{e.boton && <Boton texto={e.boton} f={f} />}
		</AbsoluteFill>
	);
};

export const Galeria: React.FC<GaleriaEdl> = (g) => {
	cargarFuente();
	const frame = useCurrentFrame();
	const actual = g.escenas.find((e) => frame >= aCuadro(e.desde) && frame < aCuadro(e.hasta)) ?? g.escenas[g.escenas.length - 1];
	const piezaFondo = g.piezas.find((p) => p.id === (actual.fondo ?? actual.pieza)) ?? g.piezas[0];
	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			<Fondo pieza={piezaFondo} f={frame} brasas={actual.brasas} />
			{g.escenas.map((e, i) => (
				<Sequence key={e.id} from={aCuadro(e.desde)} durationInFrames={Math.max(1, aCuadro(e.hasta) - aCuadro(e.desde))} layout="none" name={`escena ${e.id}`}>
					<EscenaVista g={g} e={e} indice={i} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
