const express = require("express")
const path = require("path")
const fs = require("fs")
const bodyParser = require("body-parser")
const session = require("express-session")
const { initBot, getBot, getBotStatus, getAllBots, disconnectBot } = require("../bot/discord")
const {
  loadCommands,
  saveCommand,
  deleteCommand,
  loadCommandVariants,
  saveCommandVariant,
  deleteCommandVariant,
} = require("../database/db")

// Función para iniciar el servidor
function start() {
  // Inicializar el servidor Express
  const app = express()
  const PORT = process.env.PORT || 3000

  // Middleware
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  // Configuración de sesiones
  app.use(
    session({
      secret: "farllirs-bots-secret-key",
      resave: false,
      saveUninitialized: true,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 días
    }),
  )

  // Servir archivos estáticos
  app.use(express.static(path.join(process.cwd(), "panel")))

  // Middleware para detectar dispositivo
  app.use((req, res, next) => {
    const userAgent = req.headers["user-agent"] || ""
    req.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    next()
  })

  // Servir el panel de control
  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "panel/index.html"))
  })

  // API para detectar dispositivo
  app.get("/api/detect-device", (req, res) => {
    res.json({
      isMobile: req.isMobile,
      userAgent: req.headers["user-agent"],
    })
  })

  // API para obtener estado del bot
  app.get("/api/status", (req, res) => {
    const botId = req.query.botId || "default"
    res.json(getBotStatus(botId))
  })

  // API para obtener todos los bots
  app.get("/api/bots", (req, res) => {
    res.json({ success: true, bots: getAllBots() })
  })

  // API para obtener servidores
  app.get("/api/servers", (req, res) => {
    const botId = req.query.botId || "default"
    const bot = getBot(botId)
    if (!bot) return res.json({ success: false, message: "Bot no conectado" })

    const servers = Array.from(bot.guilds.cache).map(([id, guild]) => ({
      id,
      name: guild.name,
      memberCount: guild.memberCount,
      icon: guild.iconURL() || null,
    }))

    res.json({ success: true, servers })
  })

  // API para configurar el bot
  app.post("/api/config", (req, res) => {
    const { token, prefix, botId, botName, botState } = req.body

    if (!token) {
      return res.json({ success: false, message: "Token requerido" })
    }

    try {
      // Guardar en sesión
      if (!req.session.bots) {
        req.session.bots = {}
      }

      const id = botId || "default"
      req.session.bots[id] = {
        token,
        prefix: prefix || "!",
        name: botName || "Bot de Discord",
        state: botState || "active",
      }

      initBot(token, prefix || "!", id, botName, botState)
      res.json({ success: true, message: "Bot configurado correctamente", botId: id })
    } catch (error) {
      res.json({ success: false, message: `Error: ${error.message}` })
    }
  })

  // API para desconectar un bot
  app.post("/api/disconnect", (req, res) => {
    const { botId } = req.body

    if (!botId) {
      return res.json({ success: false, message: "ID de bot requerido" })
    }

    try {
      disconnectBot(botId)

      // Eliminar de la sesión
      if (req.session.bots && req.session.bots[botId]) {
        delete req.session.bots[botId]
      }

      res.json({ success: true, message: "Bot desconectado correctamente" })
    } catch (error) {
      res.json({ success: false, message: `Error: ${error.message}` })
    }
  })

  // API para restaurar sesiones
  app.get("/api/restore-sessions", (req, res) => {
    try {
      if (req.session.bots) {
        const restoredBots = []

        Object.entries(req.session.bots).forEach(([id, config]) => {
          try {
            initBot(config.token, config.prefix, id, config.name, config.state)
            restoredBots.push(id)
          } catch (error) {
            console.error(`Error al restaurar bot ${id}:`, error)
          }
        })

        res.json({
          success: true,
          message: `${restoredBots.length} bots restaurados`,
          restoredBots,
        })
      } else {
        res.json({ success: true, message: "No hay sesiones para restaurar" })
      }
    } catch (error) {
      res.json({ success: false, message: `Error: ${error.message}` })
    }
  })

  // API para comandos
  app.get("/api/commands", (req, res) => {
    const botId = req.query.botId || "default"
    const commands = loadCommands(botId)
    res.json({ success: true, commands })
  })

  app.post("/api/commands", (req, res) => {
    const { trigger, response, code, type, botId, description, cooldown } = req.body

    if (!trigger || (!response && !code)) {
      return res.json({ success: false, message: "Trigger y respuesta/código requeridos" })
    }

    try {
      saveCommand({
        trigger,
        response,
        code,
        type: code ? "advanced" : "simple",
        botId: botId || "default",
        description: description || "",
        cooldown: cooldown || 0,
      })
      res.json({ success: true, message: "Comando guardado correctamente" })
    } catch (error) {
      res.json({ success: false, message: `Error: ${error.message}` })
    }
  })

  app.delete("/api/commands/:trigger", (req, res) => {
    const { trigger } = req.params
    const botId = req.query.botId || "default"

    try {
      deleteCommand(trigger, botId)
      res.json({ success: true, message: "Comando eliminado correctamente" })
    } catch (error) {
      res.json({ success: false, message: `Error: ${error.message}` })
    }
  })

  // API para variantes de comandos
  app.get("/api/command-variants", (req, res) => {
    const commandTrigger = req.query.command
    const botId = req.query.botId || "default"

    if (!commandTrigger) {
      return res.json({ success: false, message: "Comando requerido" })
    }

    const variants = loadCommandVariants(commandTrigger, botId)
    res.json({ success: true, variants })
  })

  app.post("/api/command-variants", (req, res) => {
    const { commandTrigger, variantName, response, code, botId } = req.body

    if (!commandTrigger || !variantName || (!response && !code)) {
      return res.json({ success: false, message: "Comando, nombre de variante y respuesta/código requeridos" })
    }

    try {
      saveCommandVariant({
        commandTrigger,
        variantName,
        response,
        code,
        type: code ? "advanced" : "simple",
        botId: botId || "default",
      })
      res.json({ success: true, message: "Variante guardada correctamente" })
    } catch (error) {
      res.json({ success: false, message: `Error: ${error.message}` })
    }
  })

  app.delete("/api/command-variants/:command/:variant", (req, res) => {
    const { command, variant } = req.params
    const botId = req.query.botId || "default"

    try {
      deleteCommandVariant(command, variant, botId)
      res.json({ success: true, message: "Variante eliminada correctamente" })
    } catch (error) {
      res.json({ success: false, message: `Error: ${error.message}` })
    }
  })

  // Iniciar el servidor
  const server = app.listen(PORT, () => {
    console.log(`Panel de control disponible en http://localhost:${PORT}`)

    // Asegurar que exista el directorio de la base de datos
    const dbDir = path.join(process.cwd(), "database")
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir)
    }

    // Crear archivo de comandos si no existe
    const commandsFile = path.join(dbDir, "commands.json")
    if (!fs.existsSync(commandsFile)) {
      fs.writeFileSync(commandsFile, JSON.stringify([], null, 2))
    }

    // Crear archivo de variantes si no existe
    const variantsFile = path.join(dbDir, "variants.json")
    if (!fs.existsSync(variantsFile)) {
      fs.writeFileSync(variantsFile, JSON.stringify([], null, 2))
    }
  })

  return server
}

module.exports = { start }
