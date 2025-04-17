const { Client, GatewayIntentBits, Events, ActivityType } = require("discord.js")
const { loadCommands, loadCommandVariants } = require("../database/db")

// Almacena múltiples instancias de bots
const clients = new Map()
const botConfigs = new Map()

// Cooldowns para comandos
const cooldowns = new Map()

/**
 * Inicializa un bot de Discord
 * @param {string} token - Token de Discord
 * @param {string} prefix - Prefijo para comandos
 * @param {string} botId - Identificador único del bot
 * @param {string} botName - Nombre del bot
 * @param {string} botState - Estado del bot (active, maintenance, readonly)
 */
function initBot(token, prefix = "!", botId = "default", botName = "Bot de Discord", botState = "active") {
  // Si ya hay un cliente con este ID, desconectarlo
  if (clients.has(botId)) {
    clients.get(botId).destroy()
    clients.delete(botId)
    botConfigs.delete(botId)
  }

  // Configurar el bot
  botConfigs.set(botId, {
    token,
    prefix,
    status: "connecting",
    startTime: null,
    name: botName,
    state: botState,
  })

  // Crear nuevo cliente con los intents necesarios
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  })

  // Evento de conexión exitosa
  client.once(Events.ClientReady, () => {
    const config = botConfigs.get(botId)
    config.status = "connected"
    config.startTime = Date.now()

    // Establecer estado según configuración
    setActivityBasedOnState(client, config.state, botName)

    console.log(`Bot ${botId} conectado como ${client.user.tag}`)
  })

  // Evento para procesar mensajes
  client.on(Events.MessageCreate, async (message) => {
    // Ignorar mensajes del propio bot
    if (message.author.bot) return

    const config = botConfigs.get(botId)

    // Si el bot está en mantenimiento o solo lectura, no procesar comandos
    if (config.state === "maintenance") return

    // Verificar si el mensaje comienza con el prefijo
    if (!message.content.startsWith(config.prefix)) return

    // Extraer el comando y los argumentos
    const args = message.content.slice(config.prefix.length).trim().split(/ +/)
    const commandName = args.shift().toLowerCase()

    // Verificar si hay un argumento para variante
    let variantName = null
    if (args.length > 0 && args[0].startsWith("-")) {
      variantName = args.shift().substring(1).toLowerCase()
    }

    // Cargar comandos personalizados
    const commands = loadCommands(botId)
    const command = commands.find((cmd) => cmd.trigger.toLowerCase() === commandName)

    if (!command) return

    // Verificar cooldown
    if (command.cooldown && command.cooldown > 0) {
      const now = Date.now()
      const cooldownKey = `${botId}-${message.author.id}-${commandName}`

      if (cooldowns.has(cooldownKey)) {
        const expirationTime = cooldowns.get(cooldownKey) + command.cooldown * 1000

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000
          return message.reply(
            `Por favor espera ${timeLeft.toFixed(1)} segundos antes de usar el comando \`${commandName}\` nuevamente.`,
          )
        }
      }

      cooldowns.set(cooldownKey, now)
      setTimeout(() => cooldowns.delete(cooldownKey), command.cooldown * 1000)
    }

    try {
      // Si se especificó una variante, intentar cargarla
      if (variantName) {
        const variants = loadCommandVariants(commandName, botId)
        const variant = variants.find((v) => v.variantName.toLowerCase() === variantName)

        if (variant) {
          if (variant.type === "simple") {
            await message.reply(variant.response)
          } else if (variant.type === "advanced" && variant.code) {
            const execute = new Function("message", "args", "client", variant.code)
            await execute(message, args, client)
          }
          return
        }
        // Si no se encuentra la variante, continuar con el comando normal
        // y mantener el argumento de variante en args
        args.unshift(`-${variantName}`)
      }

      // Si el bot está en modo solo lectura y el comando es avanzado, no ejecutarlo
      if (config.state === "readonly" && command.type === "advanced") {
        return message.reply("El bot está en modo solo lectura. Los comandos avanzados están desactivados.")
      }

      if (command.type === "simple") {
        // Comando simple: solo envía la respuesta
        await message.reply(command.response)
      } else if (command.type === "advanced" && command.code) {
        // Comando avanzado: ejecuta el código personalizado
        const execute = new Function("message", "args", "client", command.code)
        await execute(message, args, client)
      }
    } catch (error) {
      console.error(`Error al ejecutar el comando ${commandName}:`, error)
      await message.reply("Hubo un error al ejecutar este comando.")
    }
  })

  // Conectar el bot
  client.login(token).catch((error) => {
    const config = botConfigs.get(botId)
    config.status = "error"
    console.error(`Error al conectar el bot ${botId}:`, error)
    throw error
  })

  // Guardar el cliente
  clients.set(botId, client)
}

/**
 * Establece la actividad del bot según su estado
 * @param {Client} client - Cliente de Discord.js
 * @param {string} state - Estado del bot
 * @param {string} botName - Nombre del bot
 */
function setActivityBasedOnState(client, state, botName) {
  switch (state) {
    case "maintenance":
      client.user.setActivity({
        name: "🔧 En mantenimiento",
        type: ActivityType.Playing,
      })
      break
    case "readonly":
      client.user.setActivity({
        name: "📚 Modo solo lectura",
        type: ActivityType.Playing,
      })
      break
    case "active":
    default:
      client.user.setActivity({
        name: `${botName} | Activo`,
        type: ActivityType.Playing,
      })
      break
  }
}

/**
 * Desconecta un bot específico
 * @param {string} botId - ID del bot a desconectar
 */
function disconnectBot(botId) {
  if (!clients.has(botId)) {
    throw new Error(`Bot ${botId} no encontrado`)
  }

  clients.get(botId).destroy()
  clients.delete(botId)
  botConfigs.delete(botId)
}

/**
 * Obtiene el cliente de un bot específico
 * @param {string} botId - ID del bot
 * @returns {Client|null} Cliente de Discord.js
 */
function getBot(botId = "default") {
  return clients.get(botId) || null
}

/**
 * Obtiene el estado actual de un bot específico
 * @param {string} botId - ID del bot
 * @returns {Object} Estado del bot
 */
function getBotStatus(botId = "default") {
  const config = botConfigs.get(botId)
  if (!config) {
    return {
      status: "disconnected",
      prefix: "!",
      uptime: null,
      username: null,
      id: null,
      serverCount: 0,
      botId,
      name: "Bot de Discord",
      state: "active",
    }
  }

  const client = clients.get(botId)

  return {
    status: config.status,
    prefix: config.prefix,
    uptime: config.startTime ? Date.now() - config.startTime : null,
    username: client?.user?.username || null,
    id: client?.user?.id || null,
    serverCount: client?.guilds?.cache?.size || 0,
    botId,
    name: config.name,
    state: config.state,
  }
}

/**
 * Obtiene información de todos los bots conectados
 * @returns {Array} Lista de bots
 */
function getAllBots() {
  const botsList = []

  for (const [botId, config] of botConfigs.entries()) {
    const client = clients.get(botId)

    botsList.push({
      botId,
      name: config.name,
      status: config.status,
      prefix: config.prefix,
      uptime: config.startTime ? Date.now() - config.startTime : null,
      username: client?.user?.username || null,
      id: client?.user?.id || null,
      serverCount: client?.guilds?.cache?.size || 0,
      state: config.state,
    })
  }

  return botsList
}

module.exports = {
  initBot,
  getBot,
  getBotStatus,
  getAllBots,
  disconnectBot,
}
