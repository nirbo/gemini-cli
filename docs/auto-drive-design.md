# Design Document: Auto Drive (`/auto`) for Gemini CLI

## 1. Overview and Objectives

**Objective:** Port the "Auto Drive" orchestration and "Ghost-Commit Watcher"
(Auto Review) concepts from `just-every/code` into `gemini-cli`.

**Goal:** Provide an autonomous, multi-step execution mode (`/auto <task>`)
where the agent runs in a self-healing loop, verifies its own work in the
background using hidden `git worktrees`, and intelligently routes tasks using
the existing `modelRouterService` without requiring external binaries.

---

## 2. High-Level Design (HLD)

The feature consists of three main architectural pillars:

1. **The `/auto` Command & Orchestrator:** A new slash command that initiates a
   continuous agent loop. Instead of the interactive "turn-by-turn" flow, this
   command delegates the task to a specialized internal `AutoAgent` via the
   `LocalAgentExecutor`.
2. **Ghost Worktree Engine:** A background mechanism that isolates validation
   (running tests/builds) into a separate git worktree
   (`.gemini/tmp/worktrees/`) so the main workspace remains clean and the user's
   terminal isn't blocked.
3. **Simplified Model Routing:** Instead of spawning external CLI binaries (like
   `claude` or `qwen`), the `AutoAgent` can invoke other specialized internal
   agents (e.g., `codebase-investigator`) leveraging the native
   `modelRouterService` to utilize whatever models the user has configured in
   `config.yaml`.

### Architecture Diagram (Mental Model)

```text
User Input: "/auto Refactor auth flow"
       │
       ▼
[ slashCommandProcessor ] ---> Parses command (checks experimental.autoDrive flag)
       │
       ▼
[ AutoAgent (LocalAgentExecutor) ] ---> Enters autonomous loop
       │
       ├──> 1. Plan & Execute via tools (run_shell_command, replace)
       ├──> 2. Self-Heal (Parses stderr from failing tests, retries)
       │
       ▼
[ Background Review Phase ]
       │
       ├──> Create git worktree at `.gemini/tmp/worktrees/<hash>`
       ├──> Spawn child_process to run `npm test` or `cargo check`
       └──> Report status via React/Ink UI (Non-blocking)
```

---

## 3. Low-Level Design (LLD)

### 3.1. Command Registration (`packages/cli/src/ui/commands/autoCommand.ts`)

We will register a new `Command` following the existing pattern (e.g.,
`planCommand.ts`).

- **Trigger:** `/auto [prompt]`
- **Feature Flag:** The command will only be active if
  `experimental.autoDrive: true` is set in the user's `settings.json`.
- **Action:** When invoked, the UI will yield control to the backend. It will
  invoke the `AgentRegistry` to load the `auto-agent`.
- **State Management:** The UI will display a new Ink component
  `<AutoDriveStatus />` showing the current active step, number of attempts, and
  background tasks.

### 3.2. The Auto Agent (`packages/core/src/agents/auto-agent.ts`)

We will create a new `LocalAgentDefinition` implementation. This is the brain of
Auto Drive.

- **System Prompt:** The prompt will enforce the "Auto Drive" persona. It must
  explicitly instruct the agent to:
  - Break the user's request into concrete steps.
  - Execute shell commands to verify changes.
  - **Self-Heal:** If a command returns a non-zero exit code, it MUST NOT yield
    to the user. It must read the error and try another approach.
  - Call the `complete_task` tool only when tests pass or a maximum iteration
    limit (e.g., 10 loops) is reached.
- **Tools:** It will have access to all general tools (`run_shell_command`,
  `replace`, `write_file`, `read_file`), plus a new specific tool:
  `spawn_background_validation`.
- **Context Compression:** Auto Drive sessions can get long. We will rely on
  `ChatCompressionService` to aggressively prune `stdout` from old shell
  commands while preserving the original user objective.

### 3.3. Ghost Worktree Manager (`packages/core/src/utils/worktreeUtils.ts`)

To achieve the "Ghost-Commit Watcher" without messing up the user's current Git
index, we will use standard Git worktrees.

- **Functions:**
  - `createGhostWorktree(commitHash?: string): Promise<string>`
    - Executes: `git worktree add .gemini/tmp/worktrees/<timestamp-id> HEAD`
    - Returns the absolute path to the isolated directory.
  - `cleanupGhostWorktree(path: string): Promise<void>`
    - Executes: `git worktree remove --force <path>`
- _Implementation Note:_ We must ensure `.gemini/tmp/worktrees/` is added to the
  project's `.gitignore` or `.git/info/exclude`.

### 3.4. Background Validation Tool (`packages/core/src/tools/spawn_validation.ts`)

A specialized tool available only to the `AutoAgent` to offload slow tests.

- **Tool Schema:**
  - `command`: string (e.g., `npm run preflight`)
  - `description`: string
- **Execution:**
  1.  Calls `createGhostWorktree()`.
  2.  Uses `child_process.spawn` to run the requested command inside the new
      worktree path, completely detached from the main agent's event loop.
  3.  Returns immediately to the agent:
      `"Validation started in background. Proceed with other tasks."`
  4.  When the spawned process exits, it fires a message via `MessageBus`
      (`runtimeContext.getMessageBus().publish(...)`).

### 3.5. UI Integration (`packages/cli/src/ui/components/AutoDriveStatus.tsx`)

The React/Ink UI must handle asynchronous updates from the background
validations while allowing the user to continue interacting with the CLI.

- Subscribe to the `MessageBus` for `background-validation-complete` events.
- Display a persistent, non-intrusive status bar at the bottom of the screen.

---

## 4. Implementation Rules & Constraints

1. **Strict Professionalism:**
   - All code comments must be minimalist, strictly adhering to Google's style
     guides.
   - "Why" over "What".
   - Zero persona leakage (no "Rick" or "Morty" references) in the actual source
     code or commit messages.
2. **YOLO Mode Safety:**
   - Because Auto Drive executes multiple tools sequentially, we must
     temporarily enable a scoped "YOLO mode" (auto-approving tool execution)
     _strictly_ for the `AutoAgent` execution context.
3. **Handling Quota and Limits:**
   - The `AutoAgent` loop must have a strict `DEFAULT_MAX_TURNS` override
     (e.g., 20) to prevent runaway token burn if the agent gets stuck in an
     infinite failure loop.
4. **Development Flow:**
   - Implement in the fork first.
   - Verify with unit and integration tests.
   - Document in `/docs`.
   - Create upstream Feature Request Issue.
   - Attach PR.
