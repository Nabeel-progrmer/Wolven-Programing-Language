export function tokenize(code) {

    const tokens = []

    let position = 0

    const keywords = {
        let: "LET",
        const: "CONST",
        fn: "FN",
        return: "RETURN",
        result: "RESULT",

        if: "IF",
        else: "ELSE",

        while: "WHILE",

        for: "FOR",
        in: "IN",

        true: "BOOLEAN",
        false: "BOOLEAN",

        and: "AND",
        or: "OR",
        not: "NOT",

        break: "BREAK",
        continue: "CONTINUE"
    }

    function peek(offset = 0) {
        return code[position + offset]
    }

    function advance() {
        return code[position++]
    }

    function addToken(type, value = type) {
        tokens.push({
            type,
            value
        })
    }

    function isDigit(char) {
        return char >= "0" && char <= "9"
    }

    function isLetter(char) {

        return (
            (char >= "a" && char <= "z") ||
            (char >= "A" && char <= "Z") ||
            char === "_"
        )
    }

    function isAlphaNumeric(char) {
        return isLetter(char) || isDigit(char)
    }

    function isLineStart() {
        const lineStart = code.lastIndexOf("\n", position - 1) + 1

        return code.slice(lineStart, position).trim() === ""
    }

    // -------------------------
    // NUMBER
    // -------------------------

    function readNumber() {

        let value = ""

        while (isDigit(peek())) {
            value += advance()
        }

        if (
            peek() === "." &&
            isDigit(peek(1))
        ) {

            value += advance()

            while (isDigit(peek())) {
                value += advance()
            }
        }

        addToken(
            "NUMBER",
            Number(value)
        )
    }

    // -------------------------
    // STRING
    // -------------------------

    function readString() {

        advance()

        let value = ""

        while (
            position < code.length &&
            peek() !== '"'
        ) {

            if (peek() === "\\") {

                advance()

                const escaped = advance()

                if (escaped === "n") {
                    value += "\n"
                }
                else if (escaped === "t") {
                    value += "\t"
                }
                else if (escaped === '"') {
                    value += '"'
                }
                else if (escaped === "\\") {
                    value += "\\"
                }
                else {
                    value += escaped
                }

                continue
            }

            value += advance()
        }

        if (peek() !== '"') {
            throw new Error("Unterminated string")
        }

        advance()

        addToken(
            "STRING",
            value
        )
    }

    // -------------------------
    // IDENTIFIER
    // -------------------------

    function readIdentifier() {

        let value = ""

        while (
            position < code.length &&
            isAlphaNumeric(peek())
        ) {
            value += advance()
        }

        const keyword = keywords[value]

        if (keyword) {

            if (value === "true") {

                addToken(
                    "BOOLEAN",
                    true
                )
            }
            else if (value === "false") {

                addToken(
                    "BOOLEAN",
                    false
                )
            }
            else {

                addToken(
                    keyword,
                    value
                )
            }

            return
        }

        addToken(
            "IDENTIFIER",
            value
        )
    }

    // -------------------------
    // COMMENT
    // / anything /
    // -------------------------

    function readComment() {

        advance()

        const lineEnd = code.indexOf("\n", position)
        const closingSlash = code.indexOf("/", position)

        if (
            closingSlash !== -1 &&
            (lineEnd === -1 || closingSlash < lineEnd)
        ) {
            while (
                position < code.length &&
                peek() !== "\n"
            ) {
                advance()
            }

            return
        }

        while (
            position < code.length &&
            peek() !== "/"
        ) {
            advance()
        }

        if (peek() !== "/") {
            throw new Error(
                "Unterminated comment"
            )
        }

        advance()
    }

    // -------------------------
    // MAIN LEXER
    // -------------------------

    while (position < code.length) {

        const char = peek()

        // whitespace
        if (
            char === " " ||
            char === "\t" ||
            char === "\n" ||
            char === "\r"
        ) {

            advance()

            continue
        }

        // Wolven comment
        if (
            char === "/" &&
            isLineStart() &&
            peek(1) !== "=" &&
            peek(1) !== "/"
        ) {

            let end = position + 1

            while (
                end < code.length &&
                code[end] !== "/"
            ) {
                end++
            }

            if (end < code.length) {

                readComment()

                continue
            }
        }

        // number
        if (isDigit(char)) {

            readNumber()

            continue
        }

        // string
        if (char === '"') {

            readString()

            continue
        }

        // identifier
        if (isLetter(char)) {

            readIdentifier()

            continue
        }

        // two-character operators
        const two =
            char + (peek(1) ?? "")

        if (
            two === "==" ||
            two === "!=" ||
            two === ">=" ||
            two === "<=" ||
            two === "=>"
        ) {

            addToken(
                two,
                two
            )

            advance()
            advance()

            continue
        }

        // one-character symbols
        const symbols = [
            "+",
            "-",
            "*",
            "/",
            "%",
            ">",
            "<",
            "=",

            "(",
            ")",

            "{",
            "}",

            "[",
            "]",

            ",",
            ";",

            ".",
            ":"
        ]

        if (symbols.includes(char)) {

            addToken(
                char,
                char
            )

            advance()

            continue
        }

        throw new Error(
            `Unexpected character "${char}" at position ${position}`
        )
    }

    addToken(
        "EOF",
        null
    )

    return tokens
}