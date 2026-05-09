export type Phase = "phase1-plan" | "phase2-execute" | "unknown";

export const PHASE_LABELS: Record<Phase, { lead: string; backing: string[] }> = {
  "phase1-plan": { lead: "Nemotron 120B", backing: ["gpt-oss-20B Driver"] },
  "phase2-execute": { lead: "Nemotron 49B", backing: ["Qwen3-Coder 30B", "gpt-oss-20B Driver"] },
  "unknown": { lead: "\u2014", backing: [] },
};

export const MCPCONFIG_URL = process.env.MCPCONFIG_URL || "http://127.0.0.1:8003";
export const DEFAULT_MODEL = "gpt-oss-20b";
export const DEFAULT_MCP_SERVERS = [
  "workflow",
  "hands",
  "host_ops",
  "model_router",
  "container_exec",
  "transcripts",
];

// Curated tool set — safe for gpt-oss-20b Q4_K_M chat template.
// Larger sets (40+) trigger a jinja "Function is not a bool value" error in the
// model's tool-rendering template (something in the array-with-items schemas
// fails coercion). Track D adds a UI selector for opt-in expanded tools.
export const DEFAULT_TOOL_FILTER = [
  // Multi-agent specialists (route to Nemotron-49B and Qwen3-Coder-30B)
  "plan_with_nemotron", "code_with_qwen3", "check_with_nemotron",
  // Host filesystem + git + shell (policy-gated)
  "host_read_file", "host_write_file", "host_list", "host_git", "host_shell",
  // Browser essentials
  "browser_navigate", "browser_get_text", "browser_extract_content",
  "browser_click", "browser_type", "browser_screenshot",
  // Workflow flow recording (replaces autonomous breadcrumbing)
  "flow_record_start", "flow_record_step", "flow_record_stop",
];
