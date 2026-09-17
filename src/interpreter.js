export function interpret(ast) {

    const globalScope = createScope(null)

    const functions = Object.create(null)

    class ReturnSignal {

        constructor(value) {
            this.value = value
        }
    }

    class BreakSignal {}

    class ContinueSignal {}

    // =====================================
    // SCOPE
    // =====================================

    function createScope(parent) {

        return {
            values: Object.create(null),
            constants: new Set(),
            parent
        }
    }

    function findScope(scope, name) {

        let current = scope

        while (current) {

            if (
                Object.prototype.hasOwnProperty.call(
                    current.values,
                    name
                )
            ) {
                return current
            }

            current =
                current.parent
        }

        return null
    }

    function getVariable(scope, name) {

        const owner =
            findScope(scope, name)

        if (!owner) {

            throw new Error(
                `Variable "${name}" is not defined`
            )
        }

        return owner.values[name]
    }

    function defineVariable(
        scope,
        name,
        value,
        constant
    ) {

        if (
            Object.prototype.hasOwnProperty.call(
                scope.values,
                name
            )
        ) {

            throw new Error(
                `Variable "${name}" already exists`
            )
        }

        scope.values[name] =
            value

        if (constant) {
            scope.constants.add(name)
        }
    }

    function assignVariable(
        scope,
        name,
        value
    ) {

        const owner =
            findScope(scope, name)

        if (!owner) {

            throw new Error(
                `Variable "${name}" is not defined`
            )
        }

        if (
            owner.constants.has(name)
        ) {

            throw new Error(
                `Cannot assign to constant "${name}"`
            )
        }

        owner.values[name] =
            value

        return value
    }

    // =====================================
    // EVALUATE
    // =====================================

    function evaluate(
        node,
        scope
    ) {

        switch (node.type) {

            // ---------------------------------
            // Literal
            // ---------------------------------

            case "Literal":

                return node.value

            // ---------------------------------
            // Identifier
            // ---------------------------------

            case "Identifier":

                return getVariable(
                    scope,
                    node.name
                )

            // ---------------------------------
            // Array
            // ---------------------------------

            case "ArrayExpression":

                return node.elements.map(
                    element =>
                        evaluate(
                            element,
                            scope
                        )
                )

            // ---------------------------------
            // Object
            // ---------------------------------

            case "ObjectExpression": {

                const object = {}

                for (
                    const property
                    of node.properties
                ) {

                    object[property.key] =
                        evaluate(
                            property.value,
                            scope
                        )
                }

                return object
            }

            // ---------------------------------
            // Unary
            // ---------------------------------

            case "UnaryExpression": {

                const value =
                    evaluate(
                        node.argument,
                        scope
                    )

                if (
                    node.operator === "NOT"
                ) {
                    return !value
                }

                if (
                    node.operator === "-"
                ) {
                    return -value
                }

                throw new Error(
                    `Unknown unary operator "${node.operator}"`
                )
            }

            // ---------------------------------
            // Binary
            // ---------------------------------

            case "BinaryExpression": {

                const left =
                    evaluate(
                        node.left,
                        scope
                    )

                // AND short circuit
                if (
                    node.operator === "AND"
                ) {

                    return (
                        left &&
                        evaluate(
                            node.right,
                            scope
                        )
                    )
                }

                // OR short circuit
                if (
                    node.operator === "OR"
                ) {

                    return (
                        left ||
                        evaluate(
                            node.right,
                            scope
                        )
                    )
                }

                const right =
                    evaluate(
                        node.right,
                        scope
                    )

                switch (
                    node.operator
                ) {

                    case "+":
                        return left + right

                    case "-":
                        return left - right

                    case "*":
                        return left * right

                    case "/":

                        if (right === 0) {

                            throw new Error(
                                "Cannot divide by zero"
                            )
                        }

                        return left / right

                    case "%":
                        return left % right

                    case "==":
                        return left === right

                    case "!=":
                        return left !== right

                    case ">":
                        return left > right

                    case "<":
                        return left < right

                    case ">=":
                        return left >= right

                    case "<=":
                        return left <= right

                    default:

                        throw new Error(
                            `Unknown operator "${node.operator}"`
                        )
                }
            }

            // ---------------------------------
            // Assignment
            // ---------------------------------

            case "AssignmentExpression": {

                const value =
                    evaluate(
                        node.value,
                        scope
                    )

                return assignTarget(
                    node.target,
                    value,
                    scope
                )
            }

            // ---------------------------------
            // Index
            // ---------------------------------

            case "IndexExpression": {

                const object =
                    evaluate(
                        node.object,
                        scope
                    )

                const index =
                    evaluate(
                        node.index,
                        scope
                    )

                if (
                    object === null ||
                    object === undefined
                ) {

                    throw new Error(
                        "Cannot index null or undefined"
                    )
                }

                return object[index]
            }

            // ---------------------------------
            // Member
            // ---------------------------------

            case "MemberExpression": {

                const object =
                    evaluate(
                        node.object,
                        scope
                    )

                if (
                    object === null ||
                    object === undefined
                ) {

                    throw new Error(
                        `Cannot access property "${node.property}"`
                    )
                }

                return object[
                    node.property
                ]
            }

            // ---------------------------------
            // Function / Method call
            // ---------------------------------

            case "CallExpression":

                return callExpression(
                    node,
                    scope
                )

            default:

                throw new Error(
                    `Cannot evaluate "${node.type}"`
                )
        }
    }

    // =====================================
    // ASSIGNMENT TARGET
    // =====================================

    function assignTarget(
        target,
        value,
        scope
    ) {

        // variable
        if (
            target.type ===
            "Identifier"
        ) {

            return assignVariable(
                scope,
                target.name,
                value
            )
        }

        // object property
        if (
            target.type ===
            "MemberExpression"
        ) {

            const object =
                evaluate(
                    target.object,
                    scope
                )

            if (
                object === null ||
                object === undefined
            ) {

                throw new Error(
                    "Cannot assign property on null"
                )
            }

            object[
                target.property
            ] = value

            return value
        }

        // array index
        if (
            target.type ===
            "IndexExpression"
        ) {

            const object =
                evaluate(
                    target.object,
                    scope
                )

            const index =
                evaluate(
                    target.index,
                    scope
                )

            object[index] =
                value

            return value
        }

        throw new Error(
            "Invalid assignment target"
        )
    }

    // =====================================
    // FUNCTION / METHOD CALL
    // =====================================

    function callExpression(
        node,
        scope
    ) {

        // ---------------------------------
        // Normal function
        // ---------------------------------

        if (
            node.callee.type ===
            "Identifier"
        ) {

            const name =
                node.callee.name

            const fn =
                functions[name]

            if (!fn) {

                throw new Error(
                    `Function "${name}" not found`
                )
            }

            const args =
                node.arguments.map(
                    argument =>
                        evaluate(
                            argument,
                            scope
                        )
                )

            return executeFunction(
                fn,
                args
            )
        }

        // ---------------------------------
        // Method
        // ---------------------------------

        if (
            node.callee.type ===
            "MemberExpression"
        ) {

            const object =
                evaluate(
                    node.callee.object,
                    scope
                )

            const method =
                node.callee.property

            const args =
                node.arguments.map(
                    argument =>
                        evaluate(
                            argument,
                            scope
                        )
                )

            return callMethod(
                object,
                method,
                args
            )
        }

        throw new Error(
            "Invalid function call"
        )
    }

    // =====================================
    // ARRAY METHODS
    // =====================================

    function callArrayMethod(
        array,
        method,
        args
    ) {

        if (method === "add") {

            if (args.length !== 1) {

                throw new Error(
                    "add() expects 1 argument"
                )
            }

            array.push(args[0])

            return array
        }

        if (method === "remove") {

            if (args.length !== 1) {

                throw new Error(
                    "remove() expects 1 argument"
                )
            }

            const index =
                array.indexOf(
                    args[0]
                )

            if (index !== -1) {

                array.splice(
                    index,
                    1
                )
            }

            return array
        }

        if (method === "has") {

            if (args.length !== 1) {

                throw new Error(
                    "has() expects 1 argument"
                )
            }

            return array.includes(
                args[0]
            )
        }

        if (method === "size") {

            return array.length
        }

        if (method === "first") {

            return array[0]
        }

        if (method === "last") {

            return array[
                array.length - 1
            ]
        }

        if (method === "clear") {

            array.length = 0

            return array
        }

        if (method === "reverse") {

            array.reverse()

            return array
        }

        throw new Error(
            `Unknown array method "${method}"`
        )
    }

    // =====================================
    // OBJECT METHODS
    // =====================================

    function callObjectMethod(
        object,
        method,
        args
    ) {

        if (method === "get") {

            if (args.length !== 1) {

                throw new Error(
                    "get() expects 1 argument"
                )
            }

            return object[
                args[0]
            ]
        }

        if (method === "set") {

            if (args.length !== 2) {

                throw new Error(
                    "set() expects 2 arguments"
                )
            }

            object[
                args[0]
            ] = args[1]

            return object
        }

        if (method === "has") {

            if (args.length !== 1) {

                throw new Error(
                    "has() expects 1 argument"
                )
            }

            return Object.prototype
                .hasOwnProperty.call(
                    object,
                    args[0]
                )
        }

        if (method === "keys") {

            return Object.keys(
                object
            )
        }

        if (method === "size") {

            return Object.keys(
                object
            ).length
        }

        if (method === "remove") {

            if (args.length !== 1) {

                throw new Error(
                    "remove() expects 1 argument"
                )
            }

            delete object[
                args[0]
            ]

            return object
        }

        throw new Error(
            `Unknown object method "${method}"`
        )
    }

    // =====================================
    // METHOD DISPATCH
    // =====================================

    function callMethod(
        object,
        method,
        args
    ) {

        if (
            Array.isArray(object)
        ) {

            return callArrayMethod(
                object,
                method,
                args
            )
        }

        if (
            object !== null &&
            typeof object === "object"
        ) {

            return callObjectMethod(
                object,
                method,
                args
            )
        }

        throw new Error(
            `Cannot call "${method}" on this value`
        )
    }

    // =====================================
    // FUNCTION EXECUTION
    // =====================================

    function executeFunction(
        fn,
        args
    ) {

        const local =
            createScope(
                globalScope
            )

        fn.params.forEach(
            (param, index) => {

                defineVariable(
                    local,
                    param,
                    args[index],
                    false
                )
            }
        )

        try {

            executeBlock(
                fn.body,
                local
            )

        }
        catch (signal) {

            if (
                signal instanceof
                ReturnSignal
            ) {

                return signal.value
            }

            throw signal
        }

        return null
    }

    // =====================================
    // EXECUTE
    // =====================================

    function execute(
        node,
        scope
    ) {

        switch (node.type) {

            // ---------------------------------
            // Variable
            // ---------------------------------

            case "VariableDeclaration": {

                const value =
                    evaluate(
                        node.value,
                        scope
                    )

                defineVariable(
                    scope,
                    node.name,
                    value,
                    node.kind === "CONST"
                )

                return
            }

            // ---------------------------------
            // Expression
            // ---------------------------------

            case "ExpressionStatement":

                evaluate(
                    node.expression,
                    scope
                )

                return

            // ---------------------------------
            // Result
            // ---------------------------------

            case "ResultStatement": {

                const value =
                    evaluate(
                        node.value,
                        scope
                    )

                console.log(
                    formatValue(value)
                )

                return
            }

            // ---------------------------------
            // Function
            // ---------------------------------

            case "FunctionDeclaration":

                functions[node.name] =
                    node

                return

            // ---------------------------------
            // If
            // ---------------------------------

            case "IfStatement": {

                const condition =
                    evaluate(
                        node.condition,
                        scope
                    )

                if (condition) {

                    executeBlock(
                        node.consequent.body,
                        createScope(scope)
                    )

                    return
                }

                if (node.alternate) {

                    if (
                        node.alternate.type ===
                        "IfStatement"
                    ) {

                        execute(
                            node.alternate,
                            scope
                        )

                    }
                    else {

                        executeBlock(
                            node.alternate.body,
                            createScope(scope)
                        )
                    }
                }

                return
            }

            // ---------------------------------
            // While
            // ---------------------------------

            case "WhileStatement": {

                while (
                    evaluate(
                        node.condition,
                        scope
                    )
                ) {

                    try {

                        executeBlock(
                            node.body.body,
                            createScope(scope)
                        )

                    }
                    catch (signal) {

                        if (
                            signal instanceof
                            BreakSignal
                        ) {
                            break
                        }

                        if (
                            signal instanceof
                            ContinueSignal
                        ) {
                            continue
                        }

                        throw signal
                    }
                }

                return
            }

            // ---------------------------------
            // For
            // ---------------------------------

            case "ForInStatement": {

                const iterable =
                    evaluate(
                        node.iterable,
                        scope
                    )

                if (
                    !Array.isArray(iterable) &&
                    typeof iterable !== "string"
                ) {

                    throw new Error(
                        "for ... in requires an array or string"
                    )
                }

                for (
                    const item of iterable
                ) {

                    const loopScope =
                        createScope(scope)

                    defineVariable(
                        loopScope,
                        node.variable,
                        item,
                        false
                    )

                    try {

                        executeBlock(
                            node.body.body,
                            loopScope
                        )

                    }
                    catch (signal) {

                        if (
                            signal instanceof
                            BreakSignal
                        ) {
                            break
                        }

                        if (
                            signal instanceof
                            ContinueSignal
                        ) {
                            continue
                        }

                        throw signal
                    }
                }

                return
            }

            // ---------------------------------
            // Return
            // ---------------------------------

            case "ReturnStatement":

                throw new ReturnSignal(
                    evaluate(
                        node.value,
                        scope
                    )
                )

            // ---------------------------------
            // Break
            // ---------------------------------

            case "BreakStatement":

                throw new BreakSignal()

            // ---------------------------------
            // Continue
            // ---------------------------------

            case "ContinueStatement":

                throw new ContinueSignal()

            default:

                throw new Error(
                    `Unknown statement "${node.type}"`
                )
        }
    }

    // =====================================
    // BLOCK
    // =====================================

    function executeBlock(
        body,
        scope
    ) {

        for (const node of body) {

            execute(
                node,
                scope
            )
        }
    }

    // =====================================
    // FORMAT
    // =====================================

    function formatValue(value) {

        if (value === null) {
            return "null"
        }

        if (value === undefined) {
            return "undefined"
        }

        if (typeof value === "object") {

            return JSON.stringify(
                value,
                null,
                2
            )
        }

        return String(value)
    }

    // =====================================
    // RUN
    // =====================================

    executeBlock(
        ast,
        globalScope
    )
}