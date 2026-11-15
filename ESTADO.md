# ESTADO

Estado: Encargo Nakymi «Jujutsu Kaisen – Caos en Shibuya» (reel de ~15 s solo con imágenes) en pausa: faltan 2 de las 6 imágenes y confirmaciones del creador antes de renderizar.

## Qué se hizo

- 2026-11-15: leído el brief (`proyectos/2026-11-14-jujutsu-shibuya/`). Copiadas las 4 imágenes que llegaron (PNG RGBA, ~741–1048 × 1100 px, solo diseño limpio) a `proyectos/2026-11-14-jujutsu-shibuya/img/recibida-*.png`. No se renderizó nada ni se gastó nada.
- Hallazgos: no hay `img/` en el repo; faltan `foto-1` y `foto-2` (polera) y el diseño «Jujutsu Kaisen 2» solo existe como foto; no llegó el logo Nakymi; no hay `creador.json` ni `node_modules`; el motor actual (EDL + `Reel.tsx`) está hecho para video crudo con cara, no para galería de imágenes: hace falta una composición nueva en `src/`.

## Qué sigue

1. El creador responde las preguntas del brief (imágenes faltantes y cuál es cuál, logo, textos, estilo).
2. Mostrar guion final + colores de fondo en 5 líneas (ya propuestos) y esperar visto bueno.
3. `npm ci`, crear composición de galería (Remotion), render `salida/shibuya-v1.mp4` + `shibuya-v1-instagram.mp4`, `validar` y revisión QA.

## Decisiones

- Idioma: español (el brief llegó en español; no hay `creador.json`) — pendiente de confirmar.
- Sin música ni SFX (no hay biblioteca con licencia); el video debe entenderse sin sonido.
- No se publica nada.
