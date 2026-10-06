# El reto Cosnor

Quiz móvil en Next.js, TypeScript y Motion. 24 preguntas del Excel original, cuatro rondas, alias público, puntuación calculada en servidor y clasificación compartida con empates. No contiene participantes ficticios.

## Arrancar

Requiere Node.js >= 22.13.

```sh
npm install
npm run dev
```

Abrir http://localhost:3000. Para probar desde un móvil de la misma red, usar la IP local del ordenador y el puerto mostrado por Next.js. El equipo debe estar encendido y permitir la conexión.

```sh
npm test
npm run typecheck
npm run build
npm start
```

Verificación realizada: seis pruebas automáticas de contenido, puntuación, alias, concurrencia y empates; recorrido completo en navegador alternando 320, 360, 375, 390 y 430 px, horizontal 844 × 390, tableta 768 × 1024 y escritorio a 1440 px. Comprobados los controles táctiles de al menos 44 px, ausencia de desbordamiento horizontal, crédito del equipo de desarrollo, pérdida de conexión, recarga a mitad de partida y clasificación desde una segunda sesión. Son pruebas con tamaños y entrada táctil emulados, no con dispositivos físicos. La conexión PostgreSQL queda pendiente de configurar y probar con la base de producción.

Para repetir el recorrido visual: abrir una sesión aislada con `npx agent-browser --session cosnor-qa open http://localhost:3000`, obtener su endpoint con `npx agent-browser --session cosnor-qa get cdp-url` y ejecutar `node scripts/verify-browser.mjs <endpoint>`. Conserva los participantes existentes; guarda capturas en `.qa/` y elimina únicamente su propia partida al finalizar.

Para verificar el cronómetro: `node scripts/verify-timer.mjs <endpoint>`. Comprueba los 15 segundos reales, la caducidad sin confirmar, la recuperación tras recarga, la reconexión y un reloj del participante adelantado una hora. Ejecutar solo contra la instancia local; elimina exclusivamente su propia sesión de prueba. Las diez pruebas de `npm test` incluyen el límite exacto del plazo y las sesiones anteriores a la introducción del contador.

## Datos y publicación

- En local se usa SQLite persistente en `.data/quiz.sqlite`. Es una base del servidor, compartida entre navegadores; no se guarda la clasificación en localStorage.
- Con `DATABASE_URL` se usa PostgreSQL. El esquema se crea al acceder por primera vez. Usar la URL con SSL del proveedor. Esta conexión necesita permiso para crear la tabla `quiz_games` y su índice.
- En Vercel es obligatorio configurar PostgreSQL; la app rechaza SQLite efímero. No se ha publicado ni conectado una base externa en esta primera entrega.
- `NEXT_PUBLIC_APP_URL` debe ser la URL HTTPS pública final. Habilita cookies seguras al alojar fuera de Vercel. El QR definitivo se generará con esa URL, nunca con localhost.
- En un servidor Node con disco persistente también se puede usar `QUIZ_SQLITE_PATH`.
- No exponer el Excel ni `src/data/questions.json` en `public/`: contienen soluciones. El cliente recibe solo la pregunta actual y conoce la solución después de contestar.

## Reglas

- Convención Anual de Cosnor: 23 de octubre de 2026, Estadio de Riazor.
- 100 puntos por acierto, 0 por error, máximo 2.400. Cada pregunta tiene 15 segundos para confirmar la respuesta. No hay desempate por velocidad.
- El plazo se guarda en el servidor cuando se abre cada pregunta. Recargar, cambiar de pestaña o perder la conexión no lo reinicia. Una respuesta recibida en el límite o después suma cero; se muestra la solución y se permite continuar. Seleccionar sin confirmar también suma cero al agotarse el plazo.
- Las pantallas de introducción de ronda y de corrección no consumen tiempo de la siguiente pregunta. Las partidas antiguas sin plazo reciben uno al recuperarse; los resultados ya completados se conservan.
- Las cuatro rondas y las preguntas mantienen su orden. Las opciones se barajan por partida y reciben identificadores aleatorios.
- Se confirma cada respuesta; no se puede cambiar después. Las peticiones repetidas no duplican puntuación. Actualizaciones concurrentes utilizan control de revisión en la base de datos.
- La clasificación muestra hasta 50 resultados, además de la posición propia si queda fuera. Iguales puntos comparten puesto. Se actualiza cada 15 segundos mientras está visible.
- Una cookie HttpOnly aleatoria recupera la misma partida durante 30 días. Una partida por navegador; NO equivale a una persona verificada. Borrar cookies u otro navegador permite otra participación. Si hay premios, añadir códigos individuales o identificación antes del lanzamiento.
- Cada alias es un nombre visible, no una clave única. Dos personas pueden usar el mismo alias sin compartir sesión.
- El alias se muestra públicamente. No se solicita email ni teléfono. Los intentos quedan en la base hasta que el organizador los elimine; antes del lanzamiento se debe definir la duración de la campaña y su conservación.

## Contenido

`scripts/import-questions.py` lee `Copia de Cosnor preguntas.xlsx` con openpyxl y genera `src/data/questions.json`; no modifica el original.

Corrección editorial aplicada: pregunta 16, opción C: «Una cafetería», en lugar de «Una taberna». Fuente: https://www.lloyds.com/about-lloyds/history/coffee-and-commerce

Pregunta 12: comprobado el regreso en mayo de 2026 con la publicación oficial https://www.rcdeportivo.es/es/noticias/el-rc-deportivo-regresa-a-primera-division . El resto de contenidos sigue el Excel: conviene una validación editorial final del cliente, especialmente oficinas, aforo y formulaciones de coberturas.

Marca y títulos: `src/lib/config.ts`. Estilos: `src/app/globals.css`. Logotipo obtenido de la web oficial de Cosnor (https://cosnor.com/wp-content/uploads/2024/08/LaCaleColLogotipo-Cosnor.webp).

## Antes de abrir al público

Configurar la URL y la base definitivas; decidir si habrá premios y control individual de intentos; validar contenidos y preparar el QR de esa URL. Añadir un límite de creación de partidas en el alojamiento para campañas públicas de gran alcance. La versión local no tiene panel de administración ni control de identidad.
