import fs from "fs/promises";
import path from "path";
import { formatFileDiff } from "./diff.js";
import { runSubagentTurn } from "./subagent.js";
import type { ProfileId } from "./profiles.js";

const WORKSPACE_ROOT = process.cwd();

function resolvePath(relativePath: string): string {
  const resolved = path.resolve(WORKSPACE_ROOT, relativePath);
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error(`Path escapes workspace: ${relativePath}`);
  }
  return resolved;
}

export const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description:
        "Read the full text content of a file. Use this before editing a file you have not read in this conversation.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "File path relative to the project root (e.g. src/harness/session.ts)",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description:
        "Write text to a file, creating parent folders if needed. Prefer reading the file first so you know what you are changing.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative path from project root",
          },
          content: { type: "string", description: "Full new file contents" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_files",
      description:
        "List files and folders in a directory (one level). Use to explore before reading.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              'Directory relative to project root (use "." for root)',
          },
        },
      },
      required: ["path"],
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delegate",
      description: `Spawn a read-only sub-agent (planner or reviewer profile) for one focused task. Use for exploration or review without bloating this session. Returns the sub-agent reply.`,
      parameters: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "Clear instructions for the sub-agent",
          },
          profile: {
            type: "string",
            enum: ["planner", "reviewer"],
            description: "Which sub-agent profile to use",
          },
        },
        required: ["task", "profile"],
      },
    },
  },
];

export function getToolSchemas(allowedTools: string[]) {
  const allowed = new Set(allowedTools);
  return TOOLS.filter((t) => allowed.has(t.function.name));
}

export function isToolAllowed(name: string, allowedTools: string[]): boolean {
  return allowedTools.includes(name);
}

async function readFile(pathArg: string): Promise<string> {
  const filePath = resolvePath(pathArg);
  return await fs.readFile(filePath, "utf-8");
}

async function writeFile(pathArg: string, content: string): Promise<string> {
  const filePath = resolvePath(pathArg);

  let before = "";
  try {
    before = await fs.readFile(filePath, "utf-8");
  } catch {
    // new file — before stays ''
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");

  const patch = formatFileDiff(pathArg, before, content);

  return (
    `Wrote ${pathArg} (${content.length} characters)\n\n` +
    `--- diff ---\n${patch}`
  );
}

async function listFiles(pathArg: string): Promise<string> {
  const dirPath = resolvePath(pathArg);
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const lines = entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
  return lines.join("\n") || "(empty directory)";
}

export async function executeTool(
  name: string,
  argsJson: string,
  allowedTools: string[],
  parentSessionId: string,
): Promise<string> {
  if (!isToolAllowed(name, allowedTools)) {
    return (
      `Permission denied: profile does not allow "${name}". ` +
      `Allowed tools: ${allowedTools.join(", ")}`
    );
  }

  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson);
  } catch {
    return `Invalid tool arguments JSON: ${argsJson}`;
  }

  try {
    switch (name) {
      case "read_file":
        return await readFile(String(args.path ?? ""));
      case "write_file":
        return await writeFile(
          String(args.path ?? ""),
          String(args.content ?? ""),
        );
      case "list_files":
        return await listFiles(String(args.path ?? "."));
      case "delegate": {
        const profile = String(args.profile ?? "planner") as ProfileId;
        if (profile !== "planner" && profile !== "reviewer") {
          return "delegate profile must be planner or reviewer";
        }
        const result = await runSubagentTurn(
          String(args.task ?? ""),
          profile,
          parentSessionId,
        );
        return (
          `Sub-agent (${result.profileId}) session ${result.childSessionId}:\n\n` +
          result.reply
        );
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Tool error (${name}): ${message}`;
  }
}
