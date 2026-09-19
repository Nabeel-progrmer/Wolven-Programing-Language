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

    class WolvenFunction {
        constructor(params, body, closure) {
            this.params = params
            this.body = body
            this.closure = closure
        }
    }

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

            current = current.parent
        }

        return null
    }

    function getVariable(scope, name) {
        const owner = findScope(scope, name)

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

        scope.values[name] = value

        if (constant) {
            scope.constants.add(name)
        }
    }

    function assignVariable(
        scope,
        name,
        value
    ) {
        const owner = findScope(scope, name)

        if (!owner) {
            throw new Error(
                `Variable "${name}" is not defined`
            )
        }

        if (owner.constants.has(name)) {
            throw new Error(
                `Cannot assign to constant "${name}"`
            )
        }

        owner.values[name] = value

        return value
    }

    function evaluate(node, scope) {
        switch (node.type) {
            case "Literal":
                return node.value

            case "Identifier":
                return getVariable(
                    scope,
                    node.name
                )

            case "ArrayExpression":
                return node.elements.map(
                    element =>
                        evaluate(
                            element,
                            scope
                        )
                )

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

            case "FunctionExpression":
                return new WolvenFunction(
                    node.params,
                    node.body,
                    scope
                )

            case "UnaryExpression":
                return evaluateUnary(
                    node,
                    scope
                )

            case "BinaryExpression":
                return evaluateBinary(
                    node,
                    scope
                )

            case "AssignmentExpression": {
                const current =
                    node.target.type === "Identifier"
                        ? getVariable(
                            scope,
                            node.target.name
                        )
                        : evaluate(
                            node.target,
                            scope
                        )

                const value =
                    evaluate(
                        node.value,
                        scope
                    )

                let finalValue

                switch (node.operator) {
                    case "=":
                        finalValue = value
                        break

                    case "+=":
                        finalValue =
                            current + value
                        break

                    case "-=":
                        finalValue =
                            current - value
                        break

                    case "*=":
                        finalValue =
                            current * value
                        break

                    case "/=":
                        if (value === 0) {
                            throw new Error(
                                "Cannot divide by zero"
                            )
                        }

                        finalValue =
                            current / value
                        break

                    case "%=":
                        finalValue =
                            current % value
                        break

                    default:
                        throw new Error(
                            `Unknown assignment operator "${node.operator}"`
                        )
                }

                return assignTarget(
                    node.target,
                    finalValue,
                    scope
                )
            }

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

    function evaluateUnary(node, scope) {
        if (
            node.operator === "++" ||
            node.operator === "--"
        ) {
            const oldValue =
                evaluate(
                    node.argument,
                    scope
                )

            const newValue =
                node.operator === "++"
                    ? oldValue + 1
                    : oldValue - 1

            assignTarget(
                node.argument,
                newValue,
                scope
            )

            return node.prefix
                ? newValue
                : oldValue
        }

        const value =
            evaluate(
                node.argument,
                scope
            )

        if (node.operator === "NOT") {
            return !value
        }

        if (node.operator === "+") {
            return +value
        }

        if (node.operator === "-") {
            return -value
        }

        throw new Error(
            `Unknown unary operator "${node.operator}"`
        )
    }

    function evaluateBinary(node, scope) {
        const left =
            evaluate(
                node.left,
                scope
            )

        if (node.operator === "AND") {
            return (
                left &&
                evaluate(
                    node.right,
                    scope
                )
            )
        }

        if (node.operator === "OR") {
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

        switch (node.operator) {
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

    function assignTarget(
        target,
        value,
        scope
    ) {
        if (
            target.type === "Identifier"
        ) {
            return assignVariable(
                scope,
                target.name,
                value
            )
        }

        if (
            target.type === "MemberExpression"
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
                    "Cannot assign property on null or undefined"
                )
            }

            object[
                target.property
            ] = value

            return value
        }

        if (
            target.type === "IndexExpression"
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

            if (
                object === null ||
                object === undefined
            ) {
                throw new Error(
                    "Cannot assign index on null or undefined"
                )
            }

            object[index] = value

            return value
        }

        throw new Error(
            "Invalid assignment target"
        )
    }

    function callExpression(
        node,
        scope
    ) {
        if (
            node.callee.type === "Identifier"
        ) {
            const name =
                node.callee.name

            const fn =
                functions[name] ??
                getVariableSafe(
                    scope,
                    name
                )

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

            return executeCallable(
                fn,
                args
            )
        }

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
                args,
                scope
            )
        }

        const fn =
            evaluate(
                node.callee,
                scope
            )

        const args =
            node.arguments.map(
                argument =>
                    evaluate(
                        argument,
                        scope
                    )
            )

        return executeCallable(
            fn,
            args
        )
    }

    function getVariableSafe(
        scope,
        name
    ) {
        const owner =
            findScope(
                scope,
                name
            )

        if (!owner) {
            return null
        }

        return owner.values[name]
    }

    function executeCallable(fn, args) {
        if (
            fn instanceof WolvenFunction
        ) {
            const local =
                createScope(
                    fn.closure
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

        if (typeof fn === "function") {
            return fn(...args)
        }

        throw new Error(
            "Value is not callable"
        )
    }

    function callArrayMethod(
        array,
        method,
        args
    ) {
        switch (method) {
            case "add":
                requireArgs(
                    method,
                    args,
                    1
                )

                array.push(args[0])
                return array

            case "remove": {
                requireArgs(
                    method,
                    args,
                    1
                )

                const index =
                    array.indexOf(args[0])

                if (index !== -1) {
                    array.splice(
                        index,
                        1
                    )
                }

                return array
            }

            case "has":
                requireArgs(
                    method,
                    args,
                    1
                )

                return array.includes(
                    args[0]
                )

            case "size":
                requireArgs(
                    method,
                    args,
                    0
                )

                return array.length

            case "first":
                requireArgs(
                    method,
                    args,
                    0
                )

                return array[0]

            case "last":
                requireArgs(
                    method,
                    args,
                    0
                )

                return array[
                    array.length - 1
                ]

            case "clear":
                requireArgs(
                    method,
                    args,
                    0
                )

                array.length = 0
                return array

            case "reverse":
                requireArgs(
                    method,
                    args,
                    0
                )

                array.reverse()
                return array

            case "contains":
                requireArgs(
                    method,
                    args,
                    1
                )

                return array.includes(
                    args[0]
                )

            case "index":
                requireArgs(
                    method,
                    args,
                    1
                )

                return array.indexOf(
                    args[0]
                )

            case "slice":
                if (
                    args.length < 1 ||
                    args.length > 2
                ) {
                    throw new Error(
                        "slice() expects 1 or 2 arguments"
                    )
                }

                return array.slice(
                    args[0],
                    args[1]
                )

            case "join":
                if (args.length > 1) {
                    throw new Error(
                        "join() expects 0 or 1 arguments"
                    )
                }

                return array.join(
                    args[0] ?? ","
                )

            case "map": {
                requireArgs(
                    method,
                    args,
                    1
                )

                return array.map(
                    item =>
                        executeCallable(
                            args[0],
                            [item]
                        )
                )
            }

            case "filter": {
                requireArgs(
                    method,
                    args,
                    1
                )

                return array.filter(
                    item =>
                        executeCallable(
                            args[0],
                            [item]
                        )
                )
            }

            case "find": {
                requireArgs(
                    method,
                    args,
                    1
                )

                return array.find(
                    item =>
                        executeCallable(
                            args[0],
                            [item]
                        )
                )
            }

            case "sort":
                requireArgs(
                    method,
                    args,
                    0
                )

                return [...array].sort(
                    (a, b) =>
                        typeof a === "number" &&
                        typeof b === "number"
                            ? a - b
                            : String(a).localeCompare(
                                String(b)
                            )
                )

            default:
                throw new Error(
                    `Unknown array method "${method}"`
                )
        }
    }

    function callObjectMethod(
        object,
        method,
        args
    ) {
        switch (method) {
            case "get":
                requireArgs(
                    method,
                    args,
                    1
                )

                return object[args[0]]

            case "set":
                requireArgs(
                    method,
                    args,
                    2
                )

                object[
                    args[0]
                ] = args[1]

                return object

            case "has":
                requireArgs(
                    method,
                    args,
                    1
                )

                return Object.prototype
                    .hasOwnProperty.call(
                        object,
                        args[0]
                    )

            case "keys":
                requireArgs(
                    method,
                    args,
                    0
                )

                return Object.keys(object)

            case "values":
                requireArgs(
                    method,
                    args,
                    0
                )

                return Object.values(object)

            case "size":
                requireArgs(
                    method,
                    args,
                    0
                )

                return Object.keys(
                    object
                ).length

            case "remove":
                requireArgs(
                    method,
                    args,
                    1
                )

                delete object[
                    args[0]
                ]

                return object

            default:
                throw new Error(
                    `Unknown object method "${method}"`
                )
        }
    }

    function callStringMethod(
        string,
        method,
        args
    ) {
        switch (method) {
            case "size":
            case "length":
                requireArgs(
                    method,
                    args,
                    0
                )

                return string.length

            case "upper":
            case "uppercase":
                requireArgs(
                    method,
                    args,
                    0
                )

                return string.toUpperCase()

            case "lower":
            case "lowercase":
                requireArgs(
                    method,
                    args,
                    0
                )

                return string.toLowerCase()

            case "trim":
                requireArgs(
                    method,
                    args,
                    0
                )

                return string.trim()

            case "contains":
                requireArgs(
                    method,
                    args,
                    1
                )

                return string.includes(
                    String(args[0])
                )

            case "starts":
                requireArgs(
                    method,
                    args,
                    1
                )

                return string.startsWith(
                    String(args[0])
                )

            case "ends":
                requireArgs(
                    method,
                    args,
                    1
                )

                return string.endsWith(
                    String(args[0])
                )

            case "slice":
                if (
                    args.length < 1 ||
                    args.length > 2
                ) {
                    throw new Error(
                        "slice() expects 1 or 2 arguments"
                    )
                }

                return string.slice(
                    args[0],
                    args[1]
                )

            case "replace":
                requireArgs(
                    method,
                    args,
                    2
                )

                return string.replace(
                    String(args[0]),
                    String(args[1])
                )

            default:
                throw new Error(
                    `Unknown string method "${method}"`
                )
        }
    }

    function callMethod(
        object,
        method,
        args,
        scope
    ) {
        if (Array.isArray(object)) {
            return callArrayMethod(
                object,
                method,
                args
            )
        }

        if (typeof object === "string") {
            return callStringMethod(
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

    function requireArgs(
        method,
        args,
        count
    ) {
        if (args.length !== count) {
            throw new Error(
                `${method}() expects ${count} argument(s)`
            )
        }
    }

    function execute(node, scope) {
        switch (node.type) {
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

            case "ExpressionStatement":
                evaluate(
                    node.expression,
                    scope
                )

                return

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

            case "FunctionDeclaration": {
                const fn =
                    new WolvenFunction(
                        node.params,
                        node.body,
                        scope
                    )

                functions[node.name] = fn

                defineVariable(
                    scope,
                    node.name,
                    fn,
                    true
                )

                return
            }

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

            case "ReturnStatement":
                throw new ReturnSignal(
                    evaluate(
                        node.value,
                        scope
                    )
                )

            case "BreakStatement":
                throw new BreakSignal()

            case "ContinueStatement":
                throw new ContinueSignal()

            default:
                throw new Error(
                    `Unknown statement "${node.type}"`
                )
        }
    }

    function executeBlock(body, scope) {
        for (const node of body) {
            execute(
                node,
                scope
            )
        }
    }

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

    executeBlock(
        ast,
        globalScope
    )
}