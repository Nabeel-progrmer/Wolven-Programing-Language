const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function findWolvenRoot(startPath) {
    let currentPath = startPath;

    while (currentPath) {
        const packagePath = path.join(currentPath, "package.json");
        const indexPath = path.join(currentPath, "index.js");

        if (fs.existsSync(packagePath) && fs.existsSync(indexPath)) {
            try {
                const packageJson = JSON.parse(
                    fs.readFileSync(packagePath, "utf8")
                );

                if (packageJson.name === "wolven") {
                    return currentPath;
                }
            }
            catch {
                return null;
            }
        }

        const parentPath = path.dirname(currentPath);

        if (parentPath === currentPath) {
            break;
        }

        currentPath = parentPath;
    }

    return null;
}

function activate(context) {
    const runCommand = vscode.commands.registerCommand(
        "wolven.runFile",
        async () => {
            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                vscode.window.showErrorMessage(
                    "Wolven: No active file."
                );
                return;
            }

            const document = editor.document;

            if (document.languageId !== "wolven") {
                vscode.window.showErrorMessage(
                    "Wolven: Please open a .wlv file."
                );
                return;
            }

            const filePath = document.fileName;

            if (document.isDirty && !(await document.save())) {
                vscode.window.showErrorMessage(
                    "Wolven: Could not save the current file."
                );
                return;
            }

            const workspaceFolder =
                vscode.workspace.getWorkspaceFolder(document);

            const wolvenRoot = findWolvenRoot(
                workspaceFolder?.uri.fsPath ??
                path.dirname(filePath)
            );

            if (!wolvenRoot) {
                vscode.window.showErrorMessage(
                    "Wolven: Could not find the Wolven project root."
                );
                return;
            }

            const indexPath =
                path.join(wolvenRoot, "index.js");

            const terminal =
                vscode.window.createTerminal("Wolven");

            terminal.show();
            terminal.sendText(`cd /d "${wolvenRoot}"`, true);

            terminal.sendText(
                `node "${indexPath}" "${filePath}"`,
                true
            );
        }
    );

    context.subscriptions.push(runCommand);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};