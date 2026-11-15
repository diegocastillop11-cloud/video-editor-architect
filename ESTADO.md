# ESTADO

Estado: encargo Nakymi (2026-11-14, JJK Shibuya, ~15 s, solo imágenes) en pausa: no se ha renderizado nada y se esperan respuestas del creador sobre el material.

## Qué se hizo

- Se leyó el encargo y se contrastó con lo que hay en el repo y con las 4 imágenes adjuntas en el chat.
- Se revisó el entorno: no existe `creador.json`, `img/` ni `proyectos/`; `node_modules` no está instalado (`doctor.ts` falla por falta de `zod`).
- No se copió, instaló ni renderizó nada.

## Qué sigue

- Que el creador entregue `img/` completo (6 archivos con los nombres del brief; llegaron 4 con otros nombres) y resuelva las dudas del material (pieza «Jujutsu Kaisen 4» que no existe, colores de prenda que no calzan con el guion, «persona vistiendo»).
- Elegir estilo (`base-neutra` u otro) y confirmar idioma (`es`).
- Con su sí: `npm ci` + plan de `herramientas/instalar.ts`, crear `proyectos/2026-11-14-<tema>/`, mostrar guion final y colores en 5 líneas, y recién entonces renderizar `-v1` e `-instagram`.

## Decisiones

- Ninguna tomada todavía. Propuestas pendientes de su visto bueno: abrir con la pieza 5 (polera negra), sin música, texto de CTA sin plazos inventados.
