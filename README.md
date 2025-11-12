# Schedule Builder AI

A desktop application built with Electron and Vue 3 for creating and managing schedules with AI capabilities.

## Tech Stack

- **Electron** - Desktop app framework
- **Vue 3** - Frontend framework
- **Vite** - Build tool and dev server

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

### Development

Run the app in development mode with hot reload:
```bash
npm run dev
```

This will start both the Vite dev server and Electron.

## Cursor Rules

When you’re working on the project in Cursor (or any AI-assisted IDE), keep these guardrails in mind:

- **Vue 3 Composition API everywhere.** New components belong in `src/components/` with `<script setup>` and 2-space indentation.
- **Respect the Electron bridge.** Use the helpers exposed on `window.api`; only adjust `main.js`/`preload.js` when you really need a new IPC endpoint.
- **Start light, then scale up.** Kick the flow off with **Load Minimal Data**, then move to the heavy mock once you’ve confirmed the pipeline behaves.
- **Use the solver options panel.** Toggle relaxed constraints, lunch, or debug output directly in the UI to control solver cost without editing code.
- **Manual solver runs.** When you need raw logs, run `python3 backend/solver/z3_schedule_solver.py` and feed it JSON—the same constraint flags work there too.

### Build

Build the app for production:
```bash
npm run build
```

Then run the production build:
```bash
npm start
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## Authors

Mykyta, Gustav & Leon

## License

MIT
