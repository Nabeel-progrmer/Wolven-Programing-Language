import fs from "fs"

import { tokenize } from "./src/lexer.js"
import { parse } from "./src/parser.js"
import { interpret } from "./src/interpreter.js"

const filePath =
    process.argv[2] ??
    "./examples/hello.wlv"

if (!fs.existsSync(filePath)) {
    console.error(
        `Wolven Error: File "${filePath}" not found.`
    )

    process.exit(1)
}

try {
    const code =
        fs.readFileSync(
            filePath,
            "utf8"
        )

    const tokens =
        tokenize(code)

    const ast =
        parse(tokens)

    interpret(ast)
}
catch (error) {
    console.error(
        `\nWolven Error: ${error.message}\n`
    )

    process.exit(1)
}