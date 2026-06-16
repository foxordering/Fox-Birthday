# Foxito Keeper Assets v1

Versión rearmada con los assets generados por separado.

## Cómo jugar

- PC: mueve el mouse y los guantes siguen el cursor.
- Celular: arrastra el dedo y los guantes siguen el dedo con un pequeño offset para que no tapes la jugada.
- Si el balón toca los guantes, cuenta como tapada.
- 1 tapada = 1 punto.
- 3 goles y termina la partida.

## Archivos

- `index.html`
- `styles.css`
- `game.js`
- `assets/stadium_bg.png`
- `assets/gloves_dark_red.png`
- `assets/ball.png`
- `assets/fox_ready.png`
- `assets/fox_prep.png`
- `assets/fox_kick.png`

## Notas

La lógica usa Canvas, JavaScript vanilla y pointer events. No usa librerías externas.

## Cambios v3

- El balón puede ir a zonas altas, laterales y bajas del arco.
- La velocidad inicial subió.
- Los tiros pueden cambiar de dirección tarde.
- La colisión solo cuenta en la ventana final del tiro.
- La hitbox de guantes y balón quedó más estricta.

## Cambios v4 hard

- Velocidad inicial mucho más alta.
- Menor tiempo entre disparos.
- Más tiros a esquinas y laterales.
- Cambio de dirección más frecuente y más tarde.
- Hitbox más estricta.
- Balón visualmente más pequeño al llegar.
- Guantes un poco más pequeños.


## Cambios v5
- Hitbox de guantes ligeramente más grande.
- Velocidad del balón aumentada a 1.5x.


## Cambios v6
- Hitbox agrandado 6 px aprox.
- Pelota 0.6 más rápida.

## Cambios v7

- Foxito celebra con pose de pulgares arriba cuando hace gol.
- La pantalla tiembla más fuerte en el gol.
- Después de cada gol aparece cuenta atrás 3, 2, 1.
- Se añadieron sonidos generados con Web Audio para patada, tapada, gol y countdown.


## Cambios v12

- El juego ahora escala por alto y ancho del viewport.
- En PC ya no debería quedar cortado por la barra del navegador o la barra de tareas.
- Mantiene proporción vertical 420 x 760.

## Cambios v15

- Corregido bug donde el juego quedaba atrapado después del countdown inicial.
- Corregido bug donde una tapada podía devolver el juego al countdown.
- Se mantiene countdown inicial de 3, 2, 1 antes del primer tiro.
- Se mantiene la opacidad reducida de los guantes.

## Cambios v16

- El texto Prepárate y los números del countdown se subieron para no tapar a Foxito.
- El countdown quedó 3 ms más corto por número.
- El fondo de la cancha ahora deja solo pasto en la zona baja, sin círculo ni líneas blancas.
