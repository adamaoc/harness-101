import { createTwoFilesPatch } from "diff";

const MAX_DIFF_CHARS = 4000;

// Unified diff string for logging and tool results
export function formatFileDiff(
  relativePath: string,
  before: string,
  after: string,
): string {
  const patch = createTwoFilesPatch(
    relativePath,
    relativePath,
    before,
    after,
    "before",
    "after",
  );

  if (patch.length <= MAX_DIFF_CHARS) {
    return patch;
  }

  return `${patch.slice(0, MAX_DIFF_CHARS)}… (diff truncated at ${MAX_DIFF_CHARS} characters)`;
}
