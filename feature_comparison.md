# Agentic CLI Feature Comparison

This document provides a comparison of Gemini CLI against OpenCode and Every
Code to identify and port superior QoL and core features.

## Feature Comparison Matrix

| Feature Category       | Gemini CLI (Current)                     | OpenCode (`anomalyco/opencode`)        | Every Code (`just-every/code`)                           |
| :--------------------- | :--------------------------------------- | :------------------------------------- | :------------------------------------------------------- |
| **Architecture**       | Monolithic CLI / Core packages           | Client/Server (Remote execution ready) | Local-first, sophisticated Auto Drive orchestration      |
| **Agent Roles**        | Single primary agent, specialized skills | Tab-switched roles (`build` vs `plan`) | Multi-agent consensus (`/plan`, `/code`, `/solve`)       |
| **Extensibility**      | MCP Support, Hooks, Skills               | LSP integration, Built-in subagents    | MCP Support, Custom Skills                               |
| **Browser/Web**        | Basic `web_fetch`                        | Minimal                                | Deep CDP integration, headless browsing, screenshots     |
| **Context Memory**     | Workspace-based, `save_memory`           | `@general` subagent for broad search   | `AGENTS.md`, `CLAUDE.md`, Project memory                 |
| **Testing/Validation** | Manual/Prompted test execution           | Basic bash execution                   | "Ghost-Commit Watcher" / Auto Review in worktree         |
| **UI/UX QoL**          | React/Ink terminal UI                    | Highly polished TUI, Beta Desktop App  | Theme system, Code Bridge (Sentry-style error streaming) |
| **Reasoning Control**  | Implicit via prompt                      | Standard                               | Granular control (`/reasoning` low/med/high)             |

## Features to Port (Prioritized Recommendations)

1. **Ghost-Commit Watcher (Auto Review)**: Implement a background validation
   system using a separate git worktree to verify changes without blocking the
   user.
2. **Client/Server Decoupling**: Refactor to allow remote execution (frontend
   TUI separate from backend agent).
3. **Tab-Switched Roles / Multi-Agent Consensus**: Introduce distinct modes for
   planning vs. building with automatic consensus-seeking.
4. **Code Bridge**: Stream application errors and traces directly into the CLI's
   awareness.
5. **Deep Browser Integration**: Upgrade `web_fetch` to a full CDP-based
   headless browser tool.
