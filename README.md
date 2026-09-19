## Wolven

Wolven is a small programming language implemented in JavaScript.

### Requirements

- Node.js 18 or newer

### Run without installing

From the project root:

```bash
node cli.js run examples/hello.wlv
```

### Install the CLI globally

After the package is published on npm, anyone can install the command on any computer:

```bash
npm install -g wolven
wolven version
```

The global command works from any folder. To run a Wolven file:

```bash
wolven run path/to/program.wlv
```

### Install locally

For a project-local installation:

```bash
npm install wolven
npx wolven run path/to/program.wlv
```

### Install directly from GitHub

On another computer, install Node.js 18 or newer and run:

```bash
npm install -g github:Nabeel-progrmer/Wolven-Programing-Language
wolven version
```

This installs the CLI without manually downloading the project. The repository must contain the latest changes for this command to use them.

### Publish on npm (owner only)

To make `npm install -g wolven` available to everyone, the package owner must publish it once:

```bash
npm login
npm publish
```

The package is currently prepared but has not yet been published. Until the owner runs these commands, `npm install wolven` will return a package-not-found error.

After publishing, users can install it with:

```bash
npm install -g wolven
```

### Other commands

```bash
wolven help
wolven version
npm test
```

The VS Code extension is in `wolven-vscode/`. Open that folder in VS Code and install it as an extension when needed.
