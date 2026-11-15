// Copyright (c) 2026 Enrique Rocha (@soyenriquerocha)
// SPDX-License-Identifier: MIT
/**
 * galeria.ts — reel de producto armado solo con imágenes (sin video crudo): valida el guion y lo renderiza.
 *
 *   npx tsx herramientas/galeria.ts <slug> [--version N] [--validar]
 *                                          [--fotogramas 0.1,2,8.4]   (JPG de revisión en proyectos/<slug>/trabajo/qa/, sin render completo)
 *                                          [--forzar]
 *
 * Guion: proyectos/<slug>/galeria-vN.json (src/galeria/esquema.ts). Sin --version usa la más alta.
 *  1. Valida el guion y que cada imagen exista en public/ ("cumple X de Y checks"). Si falla: código 2, antes de abrir Chrome.
 *  2. Render de la composición "Galeria" (1080×1920, 30 fps, h264 CRF 16, sin audio) → salida/<tema>-vN.mp4
 *  3. Versión liviana para subir → salida/<tema>-vN-instagram.mp4 (misma duración, H.264 high, CRF 23, tope 6 Mbps, faststart).
 *     Las dos llevan una pista de audio en silencio (el video se entiende sin sonido; así los subidores no se quejan).
 *  4. Hoja de contacto de la salida → trabajo/qa/hoja-vN.jpg para revisarla a ojo.
 * Nunca pisa una salida existente (sin --forzar). No publica nada. Necesita Chrome: corre fuera del sandbox, solo en su llamada.
 */
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {Galeria, resumen, validarGaleria, type GaleriaEdl} from '../src/galeria/esquema.ts';
import {correr, esPrincipal, fallo} from './lib/fallo.ts';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USO = 'npx tsx herramientas/galeria.ts <slug> [--version N] [--validar] [--fotogramas s1,s2] [--forzar]';

function versiones(dir: string): number[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.map((n) => /^galeria-v(\d+)\.json$/.exec(n))
		.filter((m): m is RegExpExecArray => m !== null)
		.map((m) => Number(m[1]))
		.sort((a, b) => a - b);
}

export function cargarGaleria(dir: string, version?: number): {edl: GaleriaEdl; version: number} {
	const todas = versiones(dir);
	if (todas.length === 0) throw fallo('encontrar el guion', `no hay ningún galeria-vN.json en ${dir}`, 'escribe primero el guion del reel (galeria-v1.json)', 2);
	const n = version ?? todas[todas.length - 1];
	if (!todas.includes(n)) throw fallo('encontrar el guion', `no existe galeria-v${n}.json`, `usa una de: ${todas.map((v) => `v${v}`).join(', ')}`, 2);
	const analizado = Galeria.safeParse(JSON.parse(readFileSync(join(dir, `galeria-v${n}.json`), 'utf8')));
	if (!analizado.success) {
		const primero = analizado.error.issues[0];
		throw fallo(`leer galeria-v${n}.json`, `${primero.path.join('.') || 'raíz'}: ${primero.message}`, 'corrige ese campo del guion', 2);
	}
	return {edl: analizado.data, version: n};
}

function ffmpeg(args: string[], que: string): void {
	const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {encoding: 'utf8'});
	if (r.status !== 0) throw fallo(que, (r.stderr || r.error?.message || 'ffmpeg falló').split('\n')[0], 'revisa que ffmpeg esté instalado (npx tsx herramientas/doctor.ts)', 1);
}

async function main(): Promise<void> {
	const {values, positionals} = parseArgs({allowPositionals: true, options: {version: {type: 'string'}, validar: {type: 'boolean'}, fotogramas: {type: 'string'}, forzar: {type: 'boolean'}}});
	const slug = positionals[0];
	if (!slug || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+$/.test(slug)) throw fallo('leer el proyecto', 'falta el slug (AAAA-MM-DD-tema)', `uso: ${USO}`, 2);
	const dir = join(RAIZ, 'proyectos', slug);
	if (!existsSync(dir)) throw fallo('leer el proyecto', `no existe proyectos/${slug}`, 'crea la carpeta del proyecto con su img/ y su galeria-v1.json', 2);
	const {edl, version} = cargarGaleria(dir, values.version ? Number(values.version) : undefined);

	// 1. Validación.
	const checks = validarGaleria(edl);
	const archivos = edl.piezas.flatMap((p) => [p.recorte, p.original_2x]);
	for (const a of archivos) {
		checks.push({regla: `Existe ${a}`, estado: existsSync(join(RAIZ, 'public', a)) ? 'PASA' : 'FALLA', detalle: 'public/' + a});
	}
	for (const c of checks) if (c.estado === 'FALLA') console.error(`FALLA · ${c.regla} · ${c.detalle}`);
	console.log(`galeria-v${version}: ${resumen(checks)}`);
	const fallan = checks.filter((c) => c.estado === 'FALLA');
	if (fallan.length > 0) throw fallo('validar el guion', `${fallan.length} check(s) no pasan (el primero: ${fallan[0].regla})`, 'corrige galeria-vN.json (o crea una versión nueva) y vuelve a correr', 2);
	if (values.validar) return;

	// 2. Motor de render.
	const {bundle} = await import('@remotion/bundler');
	const {openBrowser, selectComposition, renderMedia, renderStill} = await import('@remotion/renderer');
	console.log('Armando el bundle de Remotion…');
	const serveUrl = await bundle({entryPoint: join(RAIZ, 'src', 'index.ts'), rootDir: RAIZ, publicDir: join(RAIZ, 'public'), symlinkPublicDir: true, enableCaching: true, onProgress: () => {}});
	// EDITOR_CHROME fija el binario; si no, el Chromium de Playwright que ya traiga la máquina (así Remotion no baja el suyo).
	const candidatos = [process.env.EDITOR_CHROME, '/opt/pw-browsers/chromium'].filter((c): c is string => Boolean(c) && existsSync(c as string));
	const navegador = await openBrowser('chrome', {logLevel: 'error', ...(candidatos[0] ? {browserExecutable: candidatos[0]} : {})});
	try {
		const comun = {serveUrl, inputProps: edl as unknown as Record<string, unknown>, puppeteerInstance: navegador, logLevel: 'error' as const};
		const composicion = await selectComposition({...comun, id: 'Galeria'});
		const cuadros = Math.round(edl.duracion_s * 30);
		if (composicion.durationInFrames !== cuadros || composicion.width !== 1080 || composicion.height !== 1920) {
			throw fallo('preparar el render', `la composición da ${composicion.width}×${composicion.height} y ${composicion.durationInFrames} cuadros; el guion pide 1080×1920 y ${cuadros}`, 'revisa calculateMetadata en src/Root.tsx', 1);
		}
		const qa = join(dir, 'trabajo', 'qa');
		mkdirSync(qa, {recursive: true});

		if (values.fotogramas) {
			for (const s of values.fotogramas.split(',').map(Number)) {
				if (!Number.isFinite(s) || s < 0 || s * 30 >= cuadros) throw fallo('sacar fotogramas', `${s} no es un segundo válido (0–${edl.duracion_s})`, 'usa segundos dentro del video', 2);
				const salida = join(qa, `f-v${version}-${s.toFixed(2)}.jpg`);
				await renderStill({...comun, composition: composicion, output: salida, frame: Math.min(cuadros - 1, Math.round(s * 30)), imageFormat: 'jpeg', jpegQuality: 92});
				console.log(`  ${salida.replace(RAIZ + '/', '')}`);
			}
			return;
		}

		const salidaDir = join(dir, 'salida');
		mkdirSync(salidaDir, {recursive: true});
		const final = join(salidaDir, `${edl.tema}-v${version}.mp4`);
		const insta = join(salidaDir, `${edl.tema}-v${version}-instagram.mp4`);
		for (const f of [final, insta]) {
			if (existsSync(f) && !values.forzar) throw fallo('renderizar', `ya existe ${f.replace(RAIZ + '/', '')}`, 'crea galeria-v(N+1).json para otra versión (o usa --forzar si lo quieres rehacer)', 2);
		}
		const crudo = join(salidaDir, `.${edl.tema}-v${version}-sin-audio.mp4`);
		let ultimo = -1;
		await renderMedia({...comun, composition: composicion, codec: 'h264', outputLocation: crudo, overwrite: true, muted: true, crf: 16, x264Preset: 'medium', pixelFormat: 'yuv420p', imageFormat: 'jpeg', jpegQuality: 95, colorSpace: 'bt709', onProgress: ({progress}) => {
			const paso = Math.floor(progress * 10);
			if (paso > ultimo) {
				ultimo = paso;
				console.log(`  video: ${paso * 10} %`);
			}
		}});

		// 3. Mux con pista en silencio y versión liviana para Instagram.
		const silencio = ['-f', 'lavfi', '-t', String(edl.duracion_s), '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];
		ffmpeg(['-i', crudo, ...silencio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-t', String(edl.duracion_s), '-movflags', '+faststart', final], 'armar el MP4 final');
		ffmpeg(['-i', crudo, ...silencio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.0', '-crf', '23', '-maxrate', '6M', '-bufsize', '12M', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '96k', '-t', String(edl.duracion_s), '-movflags', '+faststart', insta], 'armar la versión Instagram');
		spawnSync('rm', ['-f', crudo]);

		// 4. Hoja de contacto para revisar a ojo.
		ffmpeg(['-i', final, '-vf', 'fps=2,scale=270:480,tile=10x3:padding=6:color=black', '-frames:v', '1', join(qa, `hoja-v${version}.jpg`)], 'armar la hoja de contacto');
		console.log(`Listo:\n  ${final.replace(RAIZ + '/', '')}\n  ${insta.replace(RAIZ + '/', '')}\n  ${join(qa, `hoja-v${version}.jpg`).replace(RAIZ + '/', '')}`);
	} finally {
		await navegador.close({silent: true});
	}
}

if (esPrincipal(import.meta.url)) await correr(main);
