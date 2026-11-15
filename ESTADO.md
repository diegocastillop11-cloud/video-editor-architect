# ESTADO

Estado: reel de Nakymi (2026-11-14, JJK Shibuya, 15 s, 4 piezas) renderizado en v1 (MP4 + versión Instagram) y a la espera de que el creador lo revise; nada publicado.

## Qué se hizo

- Instalado lo necesario para este encargo: `npm ci`, `.venv` (uv + fonttools) y la fuente Anton (OFL, registrada en `biblioteca/LICENCIAS.md`). No se instaló whisper ni sus modelos (no hay voz).
- El motor del editor está hecho para video crudo con voz (la EDL exige una `base` en video). Se agregó una composición propia **`Galeria`** para reels solo con imágenes: `src/galeria/` (esquema + validador, layout, componente), registrada en `src/Root.tsx`; CLI `herramientas/galeria.ts` y `herramientas/py/recortar_prenda.py` (recorte de prenda por color); 10 pruebas en `pruebas/unit/galeria.test.ts`. Suite completa: 1440 pruebas pasan; `tsc --noEmit` limpio.
- Proyecto `proyectos/2026-11-14-jujutsu-shibuya/` (git lo ignora): `img/` (4 originales, intactos), `trabajo/` (recortes y ×2), `galeria-v1.json` (guion, cumple 25 de 25 checks), `notas-director.json`, `caption.txt`, `salida/jujutsu-shibuya-v1.mp4` y `…-v1-instagram.mp4` (15,0 s, 1080×1920, 30 fps, H.264).

## Qué sigue

- Que el creador vea v1 y diga qué ajustar (se cambia el guion en `galeria-v2.json`; v1 no se toca).
- Pendiente de él: el número de la «foto en polera gris» (JJK 1 o JJK 2), los PNG de los diseños en alta si los tiene (el detalle se ve suave), si quiere música con licencia, y si quiere un estilo propio (`/entrenar-estilo` con sus reels).
- Probar las variantes A/B del encargo (cambiar UNA cosa). La B («Team Gojo o Team Sukuna») no calza: en las piezas salen Yuji Itadori y Yuta Okkotsu.
- Inter no se pudo preparar (`instalar.ts`: sha256 distinto con fonttools 4.63.0); no afecta a este reel.

## Decisiones

- Estilo: `base-neutra` (única registrada); lo llamativo sale del brief, no de un estilo entrenado (regla 5).
- Abre con la polera negra JJK 5; la grilla elige esa misma; «persona vistiendo» se reemplazó por zoom out de la maqueta; precio solo «DESDE $14.000»; sin música (pista de audio en silencio).
- Detalles y lo que no se ejecutó tal cual: `proyectos/2026-11-14-jujutsu-shibuya/notas-director.json`.
