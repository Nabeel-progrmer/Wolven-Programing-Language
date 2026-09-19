#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { tokenize } from "./src/lexer.js"
import { parse } from "./src/parser.js"
import { interpret } from "./src/interpreter.js"

const VERSION = "0.2.1"
const args = process.argv.slice(2)
const command = args[0]

function showHelp() {
    console.log(`
Wolven Programming Language

Usage:
  wolven <command> [file]

Commands:
  run <file>       Run a Wolven file
  version          Show Wolven version
  help             Show this help

Examples:
  wolven run main.wlv
  wolven run examples/hello.wlv
  wolven version
`)
}

function runFile(filePath) {
    const absolutePath = path.resolve(process.cwd(), filePath)

    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File "${filePath}" not found.`)
    }

    if (path.extname(absolutePath).toLowerCase() !== ".wlv") {
        throw new Error("File must have a .wlv extension.")
    }

    const code = fs.readFileSync(absolutePath, "utf8")
    const tokens = tokenize(code)
    const ast = parse(tokens)

    interpret(ast)
}

function main() {
    switch (command) {
        case "run": {
            const file = args[1]

            if (!file) {
                throw new Error("Please provide a .wlv file.")
            }

            runFile(file)
            break
        }

        case "version":
        case "--version":
        case "-v":
            console.log(`Wolven ${VERSION}`)
            break

        case "help":
        case "--help":
        case "-h":
        case undefined:
            showHelp()
            break

        default:
            throw new Error(`Unknown command "${command}". Run 'wolven help' for usage.`)
    }
}

try {
    main()
}
catch (error) {
    console.error(`Wolven Error: ${error.message}`)
    process.exitCode = 1
}