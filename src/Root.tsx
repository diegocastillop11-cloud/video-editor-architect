// Copyright (c) 2026 Enrique Rocha (@soyenriquerocha)
// SPDX-License-Identifier: MIT
// id: er-2f298797
import {Composition} from 'remotion';
import {Reel} from './reel/Reel';
import {Galeria} from './galeria/Galeria';
import {Galeria as GaleriaEsquema, type GaleriaEdl} from './galeria/esquema';
import {EdicionBase, edicionVacia, type Edicion} from './esquema/edicion';

/** Guion mínimo válido de la galería (defaultProps del Studio). */
const galeriaVacia: GaleriaEdl = {
	version: 1,
	tema: 'vacia',
	duracion_s: 1,
	lienzo: {w: 1080, h: 1920, fps: 30},
	piezas: [{id: 'x', nombre: 'x', prenda: 'x', recorte: 'x.png', original_2x: 'x.jpg', recorte_dim: [10, 10], dim: [10, 10], detalle: {cx: 5, cy: 5, ancho: 5}, estampado: {x: 0.5, y: 0.5}, paleta: {a: '#000000', b: '#000000', brillo: '#000000'}}],
	escenas: [{id: 'e', desde: 0, hasta: 1, tipo: 'entera', pieza: 'x', entrada: 'corte', flash: null, camara: {zoom: [1, 1]}, texto: null, chip: null, boton: null, cambios_s: [], pulsos_s: [], brasas: 0}],
};

/**
 * "Reel": la composición del editor con voz. La duración sale de la EDL (`duracion_s`) vía calculateMetadata,
 * así cada render dura lo que diga edicion-vN.json y no lo que diga este archivo.
 * Ojo: Remotion NO valida las props contra el schema al renderizar; eso lo hace herramientas/validar.ts.
 *
 * "Galeria": reel de producto solo con imágenes (src/galeria/). Su guion es proyectos/<slug>/galeria-vN.json y lo valida
 * herramientas/galeria.ts antes de abrir Chrome.
 */
export const RemotionRoot: React.FC = () => (
	<>
		<Composition
			id="Reel"
			component={Reel}
			schema={EdicionBase}
			fps={30}
			width={1440}
			height={2560}
			durationInFrames={90}
			defaultProps={edicionVacia}
			calculateMetadata={({props}: {props: Edicion}) => ({
				durationInFrames: Math.max(1, Math.round(props.duracion_s * 30)),
			})}
		/>
		<Composition
			id="Galeria"
			component={Galeria}
			schema={GaleriaEsquema}
			fps={30}
			width={1080}
			height={1920}
			durationInFrames={450}
			defaultProps={galeriaVacia}
			calculateMetadata={({props}: {props: GaleriaEdl}) => ({
				durationInFrames: Math.max(1, Math.round(props.duracion_s * 30)),
			})}
		/>
	</>
);
