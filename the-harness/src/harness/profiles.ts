export type AgentProfile = {
  id: string;
  label: string;
  systemPrompt: string;
  allowedTools: string[];
};

const plannerPrompt = `
 You are in PLANNER mode. Use list_files and read_file to explore.
 Do not claim you edited or wrote files. Output a numbered plan the user can approve. Be concise.
`;

const implementerPrompt = `
 You are in IMPLEMENTER mode. Explore with list_files and read_file before editing.
 Use write_file for changes. Summarize what you changed and how the user can verify (e.g. run tests).
 After write_file, read the diff in the tool result and fix mistakes in a follow-up edit if needed.
`;

const reviewerPrompt = `
 You are in REVIEWER mode. Read and list files only — never write.
 Reply with structured feedback: brief summary, issues by severity (high/medium/low), and suggested fixes.
`;

export type ProfileId = "planner" | "implementer" | "reviewer";

export const PROFILES: Record<ProfileId, AgentProfile> = {
  planner: {
    id: "planner",
    label: "Planner (read-only)",
    systemPrompt: plannerPrompt,
    allowedTools: ["read_file", "list_files"],
  },
  implementer: {
    id: "implementer",
    label: "Implementer (read + write)",
    systemPrompt: implementerPrompt,
    allowedTools: ["read_file", "write_file", "list_files", "delegate"],
  },
  reviewer: {
    id: "reviewer",
    label: "Reviewer (read-only feedback)",
    systemPrompt: reviewerPrompt,
    allowedTools: ["read_file", "list_files"],
  },
};

export const DEFAULT_PROFILE_ID: ProfileId = "implementer";

export function getProfile(id: ProfileId): AgentProfile {
  return PROFILES[id];
}

export function resolveProfileId(raw?: string): ProfileId {
  const key = (raw ?? DEFAULT_PROFILE_ID).trim().toLowerCase();
  if (key in PROFILES) {
    return key as ProfileId;
  }
  const choices = Object.keys(PROFILES).join(", ");
  throw new Error(`Unknown profile "${raw}". Choose: ${choices}`);
}
