# Farllirs Bots

![Versión](https://img.shields.io/badge/versión-1.0.0-blue)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)

Panel de control para gestionar múltiples bots de Discord con una interfaz moderna y adaptativa.

![Farllirs Bots Dashboard](https://via.placeholder.com/800x400?text=Farllirs+Bots+Dashboard)

## Características

- 🤖 **Gestión de múltiples bots**: Administra varios bots de Discord desde un solo panel.
- 🔧 **Comandos personalizables**: Crea comandos simples o avanzados con código personalizado.
- 🔄 **Sistema de variantes**: Añade múltiples variantes a cada comando.
- 📱 **Interfaz adaptativa**: Diseño optimizado tanto para dispositivos móviles como para PC.
- 🌙 **Modo oscuro/claro**: Cambia entre temas según tus preferencias.
- ⏱️ **Cooldowns**: Configura tiempos de espera para tus comandos.
- 🔍 **Estados de bot**: Configura tus bots en modo activo, solo lectura o mantenimiento.

## Instalación

### Opción 1: Instalación global

```bash
npm install -g farllirs-bots
```

### Opción 2: Instalación en un proyecto

```bash
npm install farllirs-bots
```

## Uso

### Iniciar el panel de control

Para iniciar Farllirs Bots, ejecuta el siguiente comando:

```bash
npx farllirs-bots Active
```

Si lo has instalado globalmente, puedes usar:

```bash
farllirs-bots Active
```

La primera vez que ejecutes el comando, se instalarán todas las dependencias necesarias y se configurará el entorno.

## Guía de Uso

### 1. Configurar un Bot

1. Abre el panel de control en tu navegador (por defecto en http://localhost:3000)
2. Haz clic en "Nuevo Bot" en la barra superior
3. Introduce el token de tu bot de Discord (obtenido desde [Discord Developer Portal](https://discord.com/developers/applications))
4. Configura el prefijo de comandos (por defecto "!")
5. Asigna un nombre a tu bot y selecciona su estado inicial
6. Haz clic en "Guardar"

### 2. Crear Comandos

#### Comandos Simples

1. Ve a la sección "Comandos" en el menú lateral
2. Selecciona el bot para el que quieres crear el comando
3. Introduce el activador del comando (sin el prefijo)
4. Selecciona "Simple" como tipo de comando
5. Escribe la respuesta que dará el bot cuando se active el comando
6. Opcionalmente, añade una descripción y un tiempo de espera (cooldown)
7. Haz clic en "Guardar Comando"

Ejemplo:
- Activador: `hola`
- Respuesta: `¡Hola! ¿Cómo estás?`

Cuando un usuario escriba `!hola` en Discord, el bot responderá con "¡Hola! ¿Cómo estás?".

#### Comandos Avanzados

1. Sigue los mismos pasos que para un comando simple, pero selecciona "Avanzado" como tipo
2. Escribe el código JavaScript personalizado que se ejecutará cuando se active el comando
3. Puedes usar las variables `message`, `args` y `client` en tu código

Ejemplo:
```javascript
async function run() {
  const user = message.author.username;
  const serverName = message.guild.name;
  await message.reply(`Hola ${user}, bienvenido a ${serverName}!`);
}

run();
```

### 3. Crear Variantes de Comandos

Las variantes te permiten tener diferentes versiones de un mismo comando.

1. En la lista de comandos, haz clic en el botón de variantes (icono de ramificación)
2. Introduce el nombre de la variante
3. Configura la respuesta o el código para esta variante
4. Haz clic en "Guardar Variante"

Para usar una variante, los usuarios deben escribir: `!comando -variante`

Ejemplo: `!hola -formal` podría dar una respuesta más formal que el comando `!hola` básico.

### 4. Estados de Bot

Puedes configurar tus bots en diferentes estados:

- **Activo**: Funcionamiento normal, todos los comandos están disponibles.
- **Solo Lectura**: Solo los comandos simples están disponibles, los avanzados están desactivados.
- **Mantenimiento**: El bot no responde a ningún comando.

## Estructura de Archivos

```tree
farllirs-bots/
├── server/           # Servidor Express
│   └── index.js      # Punto de entrada del servidor
├── bot/              # Lógica del bot de Discord
│   └── discord.js    # Gestión de bots y comandos
├── database/         # Almacenamiento de datos
│   └── db.js         # Funciones de base de datos
├── panel/            # Interfaz de usuario
│   └── index.html    # Panel de control web
```

## Comandos Avanzados: Ejemplos

### Comando con argumentos

```javascript
async function run() {
  if (args.length === 0) {
    return message.reply('Por favor, proporciona un argumento.');
  }
  
  const argumento = args.join(' ');
  await message.reply(`Has dicho: ${argumento}`);
}

run();
```

### Comando con embeds

```javascript
async function run() {
  const { EmbedBuilder } = require('discord.js');
  
  const embed = new EmbedBuilder()
    .setTitle('Título del Embed')
    .setDescription('Esta es una descripción')
    .setColor('#7289DA')
    .addFields(
      { name: 'Campo 1', value: 'Valor 1', inline: true },
      { name: 'Campo 2', value: 'Valor 2', inline: true }
    )
    .setFooter({ text: 'Pie de página' });
  
  await message.reply({ embeds: [embed] });
}

run();
```

### Comando con reacciones

```javascript
async function run() {
  const sentMessage = await message.reply('Reacciona a este mensaje');
  await sentMessage.react('👍');
  await sentMessage.react('👎');
  
  // Crear un colector de reacciones
  const filter = (reaction, user) => {
    return ['👍', '👎'].includes(reaction.emoji.name) && user.id === message.author.id;
  };
  
  sentMessage.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
    .then(collected => {
      const reaction = collected.first();
      if (reaction.emoji.name === '👍') {
        sentMessage.reply('Has reaccionado con 👍');
      } else {
        sentMessage.reply('Has reaccionado con 👎');
      }
    })
    .catch(collected => {
      sentMessage.reply('No has reaccionado a tiempo.');
    });
}

run();
```

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue o un pull request para sugerencias o mejoras.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---
Dependencias necesarias

Para garantizar el correcto funcionamiento de Farllirs Bots, asegúrate de instalar estas versiones específicas de cada paquete:

```bash
npm install express@4.18.4 express-session@1.17.3 discord.js@14.14.1 body-parser@1.20.2 inquirer@8.2.6 chalk@4.1.2 figlet@1.5.2
```
Requisitos recomendados:

> Node.js: >=16.x

> npm: >=8.x


> Nota: Estas versiones han sido probadas para mantener estabilidad y compatibilidad, especialmente en entornos Android con Termux.

---

## Próximas Funciones

- Inicio de sesión con Discord (OAuth2)
- Verificación de dos pasos
- Estadísticas avanzadas de uso
- Soporte para slash commands
- Personalización de temas
- 