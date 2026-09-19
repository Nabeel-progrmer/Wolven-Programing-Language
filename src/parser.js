export function parse(tokens) {
    let position = 0

    function peek(offset = 0) {
        return tokens[position + offset]
    }

    function advance() {
        return tokens[position++]
    }

    function check(type) {
        return peek()?.type === type
    }

    function match(...types) {
        for (const type of types) {
            if (check(type)) {
                advance()
                return true
            }
        }

        return false
    }

    function expect(type, message) {
        if (!check(type)) {
            const token = peek()

            throw new Error(
                message ??
                `Expected "${type}" but found "${token?.value}"`
            )
        }

        return advance()
    }

    function program() {
        const body = []

        while (!check("EOF")) {
            if (match(";")) {
                continue
            }

            body.push(statement())
        }

        return body
    }

    function statement() {
        if (
            check("LET") ||
            check("CONST")
        ) {
            return variableDeclaration()
        }

        if (check("FN")) {
            return functionDeclaration()
        }

        if (check("IF")) {
            return ifStatement()
        }

        if (check("WHILE")) {
            return whileStatement()
        }

        if (check("FOR")) {
            return forStatement()
        }

        if (check("RETURN")) {
            return returnStatement()
        }

        if (check("BREAK")) {
            advance()
            match(";")

            return {
                type: "BreakStatement"
            }
        }

        if (check("CONTINUE")) {
            advance()
            match(";")

            return {
                type: "ContinueStatement"
            }
        }

        if (check("RESULT")) {
            return resultStatement()
        }

        const expressionValue = expression()

        match(";")

        return {
            type: "ExpressionStatement",
            expression: expressionValue
        }
    }

    function variableDeclaration() {
        const kind = advance().type

        const name = expect(
            "IDENTIFIER",
            "Expected variable name"
        ).value

        expect(
            "=",
            "Expected '=' after variable name"
        )

        const value = expression()

        match(";")

        return {
            type: "VariableDeclaration",
            kind,
            name,
            value
        }
    }

    function resultStatement() {
        advance()

        expect(
            "(",
            "Expected '(' after result"
        )

        const value = expression()

        expect(
            ")",
            "Expected ')' after result"
        )

        match(";")

        return {
            type: "ResultStatement",
            value
        }
    }

    function functionDeclaration() {
        advance()

        const name = expect(
            "IDENTIFIER",
            "Expected function name"
        ).value

        expect(
            "(",
            "Expected '(' after function name"
        )

        const params = []

        if (!check(")")) {
            do {
                params.push(
                    expect(
                        "IDENTIFIER",
                        "Expected parameter name"
                    ).value
                )
            } while (match(","))
        }

        expect(
            ")",
            "Expected ')' after parameters"
        )

        const body = block()

        return {
            type: "FunctionDeclaration",
            name,
            params,
            body
        }
    }

    function ifStatement() {
        advance()

        const condition = expression()

        const consequent = block()

        let alternate = null

        if (match("ELSE")) {
            if (check("IF")) {
                alternate = ifStatement()
            }
            else {
                alternate = {
                    type: "BlockStatement",
                    body: block()
                }
            }
        }

        return {
            type: "IfStatement",
            condition,

            consequent: {
                type: "BlockStatement",
                body: consequent
            },

            alternate
        }
    }

    function whileStatement() {
        advance()

        const condition = expression()

        const body = block()

        return {
            type: "WhileStatement",
            condition,

            body: {
                type: "BlockStatement",
                body
            }
        }
    }

    function forStatement() {
        advance()

        const variable = expect(
            "IDENTIFIER",
            "Expected loop variable"
        ).value

        expect(
            "IN",
            "Expected 'in' in for loop"
        )

        const iterable = expression()

        const body = block()

        return {
            type: "ForInStatement",
            variable,
            iterable,

            body: {
                type: "BlockStatement",
                body
            }
        }
    }

    function returnStatement() {
        advance()

        let value = {
            type: "Literal",
            value: null
        }

        if (
            !check(";") &&
            !check("}") &&
            !check("EOF")
        ) {
            value = expression()
        }

        match(";")

        return {
            type: "ReturnStatement",
            value
        }
    }

    function block() {
        expect(
            "{",
            "Expected '{'"
        )

        const body = []

        while (
            !check("}") &&
            !check("EOF")
        ) {
            if (match(";")) {
                continue
            }

            body.push(statement())
        }

        expect(
            "}",
            "Expected '}'"
        )

        return body
    }

    function expression() {
        return assignment()
    }

    function assignment() {
        const left = logicalOr()

        if (
            match(
                "=",
                "+=",
                "-=",
                "*=",
                "/=",
                "%="
            )
        ) {
            const operator =
                tokens[position - 1].type

            const value = assignment()

            if (
                left.type !== "Identifier" &&
                left.type !== "MemberExpression" &&
                left.type !== "IndexExpression"
            ) {
                throw new Error(
                    "Invalid assignment target"
                )
            }

            return {
                type: "AssignmentExpression",
                target: left,
                operator,
                value
            }
        }

        return left
    }

    function logicalOr() {
        let left = logicalAnd()

        while (
            match("OR", "||")
        ) {
            const operator =
                tokens[position - 1].type

            const right = logicalAnd()

            left = {
                type: "BinaryExpression",
                operator:
                    operator === "||"
                        ? "OR"
                        : operator,
                left,
                right
            }
        }

        return left
    }

    function logicalAnd() {
        let left = equality()

        while (
            match("AND", "&&")
        ) {
            const operator =
                tokens[position - 1].type

            const right = equality()

            left = {
                type: "BinaryExpression",
                operator:
                    operator === "&&"
                        ? "AND"
                        : operator,
                left,
                right
            }
        }

        return left
    }

    function equality() {
        let left = comparison()

        while (
            check("==") ||
            check("!=")
        ) {
            const operator =
                advance().type

            const right = comparison()

            left = {
                type: "BinaryExpression",
                operator,
                left,
                right
            }
        }

        return left
    }

    function comparison() {
        let left = term()

        while (
            check(">") ||
            check("<") ||
            check(">=") ||
            check("<=")
        ) {
            const operator =
                advance().type

            const right = term()

            left = {
                type: "BinaryExpression",
                operator,
                left,
                right
            }
        }

        return left
    }

    function term() {
        let left = factor()

        while (
            check("+") ||
            check("-")
        ) {
            const operator =
                advance().type

            const right = factor()

            left = {
                type: "BinaryExpression",
                operator,
                left,
                right
            }
        }

        return left
    }

    function factor() {
        let left = unary()

        while (
            check("*") ||
            check("/") ||
            check("%")
        ) {
            const operator =
                advance().type

            const right = unary()

            left = {
                type: "BinaryExpression",
                operator,
                left,
                right
            }
        }

        return left
    }

    function unary() {
        if (
            match(
                "NOT",
                "!",
                "+",
                "-",
                "++",
                "--"
            )
        ) {
            const operator =
                tokens[position - 1].type

            return {
                type: "UnaryExpression",
                operator:
                    operator === "!"
                        ? "NOT"
                        : operator,
                argument: unary(),
                prefix: true
            }
        }

        return postfix()
    }

    function postfix() {
        let value = primary()

        while (true) {
            if (match("(")) {
                const args = []

                if (!check(")")) {
                    do {
                        args.push(expression())
                    } while (match(","))
                }

                expect(
                    ")",
                    "Expected ')' after arguments"
                )

                value = {
                    type: "CallExpression",
                    callee: value,
                    arguments: args
                }

                continue
            }

            if (match("[")) {
                const index = expression()

                expect(
                    "]",
                    "Expected ']'"
                )

                value = {
                    type: "IndexExpression",
                    object: value,
                    index
                }

                continue
            }

            if (match(".")) {
                const property = expect(
                    "IDENTIFIER",
                    "Expected property name"
                ).value

                value = {
                    type: "MemberExpression",
                    object: value,
                    property
                }

                continue
            }

            if (
                match("++", "--")
            ) {
                value = {
                    type: "UnaryExpression",
                    operator:
                        tokens[position - 1].type,
                    argument: value,
                    prefix: false
                }

                continue
            }

            break
        }

        return value
    }

    function primary() {
        const token = advance()

        if (!token) {
            throw new Error(
                "Unexpected end of code"
            )
        }

        if (
            token.type === "NUMBER" ||
            token.type === "STRING" ||
            token.type === "BOOLEAN"
        ) {
            return {
                type: "Literal",
                value: token.value
            }
        }

        if (token.type === "NULL") {
            return {
                type: "Literal",
                value: null
            }
        }

        if (token.type === "UNDEFINED") {
            return {
                type: "Literal",
                value: undefined
            }
        }

        if (
            token.type === "IDENTIFIER"
        ) {
            return {
                type: "Identifier",
                name: token.value
            }
        }

        if (token.type === "(") {
            const value = expression()

            expect(
                ")",
                "Expected ')'"
            )

            // Arrow function
            if (match("=>")) {
                const params = []

                if (value.type === "Identifier") {
                    params.push(value.name)
                }
                else {
                    throw new Error(
                        "Invalid arrow function parameters"
                    )
                }

                return arrowFunction(
                    params
                )
            }

            return value
        }

        if (token.type === "[") {
            const elements = []

            if (!check("]")) {
                do {
                    elements.push(
                        expression()
                    )
                } while (match(","))
            }

            expect(
                "]",
                "Expected ']' after array"
            )

            return {
                type: "ArrayExpression",
                elements
            }
        }

        if (token.type === "{") {
            const properties = []

            if (!check("}")) {
                do {
                    const keyToken = advance()

                    if (
                        keyToken.type !== "IDENTIFIER" &&
                        keyToken.type !== "STRING"
                    ) {
                        throw new Error(
                            "Expected object key"
                        )
                    }

                    const key = keyToken.value

                    expect(
                        ":",
                        "Expected ':' after object key"
                    )

                    const value = expression()

                    properties.push({
                        key,
                        value
                    })
                } while (match(","))
            }

            expect(
                "}",
                "Expected '}' after object"
            )

            return {
                type: "ObjectExpression",
                properties
            }
        }

        throw new Error(
            `Unexpected token "${token.value}"`
        )
    }

    function arrowFunction(params) {
        let body

        if (check("{")) {
            body = block()
        }
        else {
            body = [
                {
                    type: "ReturnStatement",
                    value: expression()
                }
            ]
        }

        return {
            type: "FunctionExpression",
            params,
            body
        }
    }

    return program()
}