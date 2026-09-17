import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

import { tokenize } from "../src/lexer.js"
import { parse } from "../src/parser.js"
import { interpret } from "../src/interpreter.js"

const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
)

const code = fs.readFileSync(
    path.join(projectRoot, "examples", "hello.wlv"),
    "utf-8"
)

const tokens = tokenize(code)

const ast = parse(tokens)

interpret(ast)