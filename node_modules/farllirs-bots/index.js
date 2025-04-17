#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")
const chalk = require("chalk")
const figlet = require("figlet")
const inquirer = require("inquirer")

// Verificar si es la primera ejecución
const configPath = path.join(process.cwd(), ".farllirs-config.json")
const isFirstRun = !fs.existsSync(configPath)

// Mostrar banner
console.log(chalk.cyan(figlet.textSync("Farllirs Bots", { horizontalLayout: "full" })))
console.log(chalk.cyan("v1.0.0 - Panel de Control para Bots de Discord\n"))

// Función para verificar dependencias
async function checkDependencies() {
  console.log(chalk.yellow("Verificando dependencias necesarias..."))

  const requiredDeps = ["express", "express-session", "discord.js", "body-parser", "chalk", "figlet", "inquirer"]

  const missingDeps = []

  for (const dep of requiredDeps) {
    try {
      require.resolve(dep)
    } catch (e) {
      missingDeps.push(dep)
    }
  }

  if (missingDeps.length > 0) {
    console.log(chalk.red("Faltan las siguientes dependencias:"))
    console.log(chalk.red(missingDeps.join(", ")))

    const { install } = await inquirer.prompt([
      {
        type: "confirm",
        name: "install",
        message: "¿Deseas instalar las dependencias faltantes ahora?",
        default: true,
      },
    ])

    if (install) {
      console.log(chalk.yellow("Instalando dependencias..."))
      try {
        execSync(`npm install ${missingDeps.join(" ")} --save`, { stdio: "inherit" })
        console.log(chalk.green("Dependencias instaladas correctamente."))
      } catch (error) {
        console.error(chalk.red("Error al instalar dependencias:"))
        console.error(error.message)
        process.exit(1)
      }
    } else {
      console.log(chalk.red("No se pueden instalar las dependencias. Por favor, instálalas manualmente:"))
      console.log(chalk.yellow(`npm install ${missingDeps.join(" ")} --save`))
      process.exit(1)
    }
  } else {
    console.log(chalk.green("Todas las dependencias están instaladas."))
  }
}

// Función para crear estructura de directorios
function createDirectoryStructure() {
  console.log(chalk.yellow("Creando estructura de directorios..."))

  const dirs = [
    path.join(process.cwd(), "server"),
    path.join(process.cwd(), "bot"),
    path.join(process.cwd(), "database"),
    path.join(process.cwd(), "panel"),
  ]

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })

  console.log(chalk.green("Estructura de directorios creada."))
}

// Función para copiar archivos del módulo
function copyModuleFiles() {
  console.log(chalk.yellow("Copiando archivos del módulo..."))

  const files = [
    { src: path.join(__dirname, "server", "index.js"), dest: path.join(process.cwd(), "server", "index.js") },
    { src: path.join(__dirname, "bot", "discord.js"), dest: path.join(process.cwd(), "bot", "discord.js") },
    { src: path.join(__dirname, "database", "db.js"), dest: path.join(process.cwd(), "database", "db.js") },
    { src: path.join(__dirname, "panel", "index.html"), dest: path.join(process.cwd(), "panel", "index.html") },
  ]

  files.forEach((file) => {
    if (!fs.existsSync(file.dest)) {
      fs.copyFileSync(file.src, file.dest)
    }
  })

  console.log(chalk.green("Archivos copiados correctamente."))
}

// Función para guardar configuración
function saveConfig() {
  const config = {
    version: "1.0.0",
    firstRun: false,
    installDate: new Date().toISOString(),
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  console.log(chalk.green("Configuración guardada."))
}

// Función para iniciar el servidor
function startServer() {
  console.log(chalk.yellow("Iniciando servidor Farllirs Bots..."))

  try {
    // Importar el servidor después de verificar dependencias
    const server = require("./server")
    server.start()
  } catch (error) {
    console.error(chalk.red("Error al iniciar el servidor:"))
    console.error(error.message)
    process.exit(1)
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2)

  // Verificar comando
  if (args.length === 0 || args[0] !== "Active") {
    console.log(chalk.yellow("Para iniciar Farllirs Bots, usa el comando:"))
    console.log(chalk.cyan("npx farllirs-bots Active"))
    process.exit(0)
  }

  // Primera ejecución
  if (isFirstRun) {
    console.log(chalk.yellow("Primera ejecución detectada. Configurando Farllirs Bots..."))

    await checkDependencies()
    createDirectoryStructure()
    copyModuleFiles()
    saveConfig()

    console.log(chalk.green("¡Farllirs Bots ha sido configurado correctamente!"))
  } else {
    // Verificar dependencias en cada ejecución
    await checkDependencies()
  }

  // Iniciar servidor
  startServer()
}

// Ejecutar función principal
main().catch((error) => {
  console.error(chalk.red("Error inesperado:"))
  console.error(error)
  process.exit(1)
})
