const fs = require("fs")
const path = require("path")

const COMMANDS_FILE = path.join(__dirname, "commands.json")
const VARIANTS_FILE = path.join(__dirname, "variants.json")

/**
 * Carga los comandos desde el archivo JSON
 * @param {string} botId - ID del bot
 * @returns {Array} Lista de comandos
 */
function loadCommands(botId = "default") {
  try {
    if (!fs.existsSync(COMMANDS_FILE)) {
      fs.writeFileSync(COMMANDS_FILE, JSON.stringify([], null, 2))
      return []
    }

    const data = fs.readFileSync(COMMANDS_FILE, "utf8")
    const commands = JSON.parse(data)

    // Filtrar comandos por botId
    return commands.filter((cmd) => !cmd.botId || cmd.botId === botId)
  } catch (error) {
    console.error("Error al cargar comandos:", error)
    return []
  }
}

/**
 * Guarda un comando en la base de datos
 * @param {Object} command - Comando a guardar
 */
function saveCommand(command) {
  try {
    const commands = loadAllCommands()
    const existingIndex = commands.findIndex(
      (cmd) => cmd.trigger === command.trigger && (!cmd.botId || cmd.botId === command.botId),
    )

    if (existingIndex !== -1) {
      // Actualizar comando existente
      commands[existingIndex] = {
        ...commands[existingIndex],
        ...command,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // Agregar nuevo comando
      commands.push({
        ...command,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2))
    return true
  } catch (error) {
    console.error("Error al guardar comando:", error)
    throw error
  }
}

/**
 * Elimina un comando de la base de datos
 * @param {string} trigger - Trigger del comando a eliminar
 * @param {string} botId - ID del bot
 */
function deleteCommand(trigger, botId = "default") {
  try {
    let commands = loadAllCommands()
    const initialLength = commands.length

    commands = commands.filter((cmd) => !(cmd.trigger === trigger && (!cmd.botId || cmd.botId === botId)))

    if (commands.length === initialLength) {
      throw new Error("Comando no encontrado")
    }

    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2))

    // También eliminar todas las variantes asociadas
    deleteAllCommandVariants(trigger, botId)

    return true
  } catch (error) {
    console.error("Error al eliminar comando:", error)
    throw error
  }
}

/**
 * Carga todos los comandos sin filtrar por botId
 * @returns {Array} Lista de todos los comandos
 */
function loadAllCommands() {
  try {
    if (!fs.existsSync(COMMANDS_FILE)) {
      fs.writeFileSync(COMMANDS_FILE, JSON.stringify([], null, 2))
      return []
    }

    const data = fs.readFileSync(COMMANDS_FILE, "utf8")
    return JSON.parse(data)
  } catch (error) {
    console.error("Error al cargar todos los comandos:", error)
    return []
  }
}

/**
 * Carga las variantes de un comando específico
 * @param {string} commandTrigger - Trigger del comando
 * @param {string} botId - ID del bot
 * @returns {Array} Lista de variantes
 */
function loadCommandVariants(commandTrigger, botId = "default") {
  try {
    if (!fs.existsSync(VARIANTS_FILE)) {
      fs.writeFileSync(VARIANTS_FILE, JSON.stringify([], null, 2))
      return []
    }

    const data = fs.readFileSync(VARIANTS_FILE, "utf8")
    const variants = JSON.parse(data)

    // Filtrar variantes por comando y botId
    return variants.filter((v) => v.commandTrigger === commandTrigger && (!v.botId || v.botId === botId))
  } catch (error) {
    console.error("Error al cargar variantes:", error)
    return []
  }
}

/**
 * Guarda una variante de comando
 * @param {Object} variant - Variante a guardar
 */
function saveCommandVariant(variant) {
  try {
    const variants = loadAllVariants()
    const existingIndex = variants.findIndex(
      (v) =>
        v.commandTrigger === variant.commandTrigger &&
        v.variantName === variant.variantName &&
        (!v.botId || v.botId === variant.botId),
    )

    if (existingIndex !== -1) {
      // Actualizar variante existente
      variants[existingIndex] = {
        ...variants[existingIndex],
        ...variant,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // Agregar nueva variante
      variants.push({
        ...variant,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    fs.writeFileSync(VARIANTS_FILE, JSON.stringify(variants, null, 2))
    return true
  } catch (error) {
    console.error("Error al guardar variante:", error)
    throw error
  }
}

/**
 * Elimina una variante de comando
 * @param {string} commandTrigger - Trigger del comando
 * @param {string} variantName - Nombre de la variante
 * @param {string} botId - ID del bot
 */
function deleteCommandVariant(commandTrigger, variantName, botId = "default") {
  try {
    let variants = loadAllVariants()
    const initialLength = variants.length

    variants = variants.filter(
      (v) => !(v.commandTrigger === commandTrigger && v.variantName === variantName && (!v.botId || v.botId === botId)),
    )

    if (variants.length === initialLength) {
      throw new Error("Variante no encontrada")
    }

    fs.writeFileSync(VARIANTS_FILE, JSON.stringify(variants, null, 2))
    return true
  } catch (error) {
    console.error("Error al eliminar variante:", error)
    throw error
  }
}

/**
 * Elimina todas las variantes de un comando
 * @param {string} commandTrigger - Trigger del comando
 * @param {string} botId - ID del bot
 */
function deleteAllCommandVariants(commandTrigger, botId = "default") {
  try {
    let variants = loadAllVariants()

    variants = variants.filter((v) => !(v.commandTrigger === commandTrigger && (!v.botId || v.botId === botId)))

    fs.writeFileSync(VARIANTS_FILE, JSON.stringify(variants, null, 2))
    return true
  } catch (error) {
    console.error("Error al eliminar todas las variantes:", error)
    // No lanzar error, solo registrar
    return false
  }
}

/**
 * Carga todas las variantes sin filtrar
 * @returns {Array} Lista de todas las variantes
 */
function loadAllVariants() {
  try {
    if (!fs.existsSync(VARIANTS_FILE)) {
      fs.writeFileSync(VARIANTS_FILE, JSON.stringify([], null, 2))
      return []
    }

    const data = fs.readFileSync(VARIANTS_FILE, "utf8")
    return JSON.parse(data)
  } catch (error) {
    console.error("Error al cargar todas las variantes:", error)
    return []
  }
}

module.exports = {
  loadCommands,
  saveCommand,
  deleteCommand,
  loadCommandVariants,
  saveCommandVariant,
  deleteCommandVariant,
}
