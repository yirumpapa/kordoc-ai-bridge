import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { detectFormat, markdownToHwpx, parse } from "kordoc";

const EDITABLE_START = "<!-- AI_BRIDGE_EDITABLE_START -->";
const EDITABLE_END = "<!-- AI_BRIDGE_EDITABLE_END -->";

function ensureParentDir(path) {
  const parent = dirname(path);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }
}

function normalizeParseOptions({ pages, removeHeaderFooter }) {
  const options = {};

  if (pages && typeof pages === "string" && pages.trim()) {
    options.pages = pages.trim();
  }

  if (removeHeaderFooter) {
    options.removeHeaderFooter = true;
  }

  return options;
}

function buildAiMarkdown({ sourceFile, format, metadata, markdown, templateMode = "guarded" }) {
  const metadataBlock = JSON.stringify(metadata ?? {}, null, 2);

  if (templateMode === "raw") {
    return markdown;
  }

  return [
    "# AI Working Document",
    "",
    "## Source Info",
    `- source_file: ${sourceFile}`,
    `- source_format: ${format}`,
    `- generated_at: ${new Date().toISOString()}`,
    "",
    "## Metadata (JSON)",
    "```json",
    metadataBlock,
    "```",
    "",
    "## Editing Rules",
    "- Keep everything outside the editable block unchanged.",
    "- Edit only the content between start/end markers.",
    "- You can rewrite headings, paragraphs, and tables inside the editable block.",
    "",
    "## Editable Content",
    EDITABLE_START,
    markdown,
    EDITABLE_END,
    "",
  ].join("\n");
}

function extractEditableSection(markdown) {
  const start = markdown.indexOf(EDITABLE_START);
  const end = markdown.indexOf(EDITABLE_END);

  if (start === -1 || end === -1 || end <= start) {
    return { found: false, content: markdown };
  }

  const content = markdown.slice(start + EDITABLE_START.length, end).trim();
  return { found: true, content };
}

function readMarkdownFromInput(inputPath, { strictTemplate = false } = {}) {
  const raw = readFileSync(inputPath, "utf8");
  const extension = extname(inputPath).toLowerCase();

  let markdown;

  if (extension === ".json") {
    const parsed = JSON.parse(raw);
    if (!parsed.markdown || typeof parsed.markdown !== "string") {
      throw new Error("JSON 입력에는 markdown 문자열 필드가 필요합니다.");
    }
    markdown = parsed.markdown;
  } else {
    markdown = raw;
  }

  const extracted = extractEditableSection(markdown);

  if (strictTemplate && !extracted.found) {
    throw new Error("strict-template 모드에서는 AI_BRIDGE_EDITABLE_START/END 마커가 필요합니다.");
  }

  return extracted.content;
}

export async function parseDocumentBuffer({
  fileBuffer,
  sourceFile,
  parseOptions,
  templateMode = "guarded",
}) {
  const detected = await detectFormat(fileBuffer);
  const normalizedOptions = normalizeParseOptions(parseOptions ?? {});
  const parseResult = await parse(fileBuffer, normalizedOptions);

  if (!parseResult.success) {
    const message = parseResult.error?.message ?? "문서 파싱에 실패했습니다.";
    throw new Error(message);
  }

  const aiMarkdown = buildAiMarkdown({
    sourceFile,
    format: detected,
    metadata: parseResult.metadata,
    markdown: parseResult.markdown,
    templateMode,
  });

  const structuredPayload = {
    sourceFile,
    sourceFormat: detected,
    generatedAt: new Date().toISOString(),
    metadata: parseResult.metadata ?? null,
    warnings: parseResult.warnings ?? [],
    blocks: parseResult.blocks ?? [],
    markdown: parseResult.markdown,
  };

  return {
    sourceFormat: detected,
    aiMarkdown,
    structuredPayload,
  };
}

export async function extractToFiles({
  inputPath,
  outDir = "./output",
  name,
  parseOptions,
  templateMode = "guarded",
}) {
  const resolvedInput = resolve(inputPath);
  const fileBuffer = readFileSync(resolvedInput);
  const sourceFile = basename(resolvedInput);
  const baseName = name || basename(resolvedInput, extname(resolvedInput));

  const { aiMarkdown, structuredPayload } = await parseDocumentBuffer({
    fileBuffer,
    sourceFile,
    parseOptions,
    templateMode,
  });

  const resolvedOutDir = resolve(outDir);
  mkdirSync(resolvedOutDir, { recursive: true });

  const aiMarkdownPath = join(resolvedOutDir, `${baseName}.ai.md`);
  const structuredJsonPath = join(resolvedOutDir, `${baseName}.structured.json`);

  writeFileSync(aiMarkdownPath, aiMarkdown, "utf8");
  writeFileSync(structuredJsonPath, JSON.stringify(structuredPayload, null, 2), "utf8");

  return {
    aiMarkdownPath,
    structuredJsonPath,
  };
}

export function markdownToHwpxBuffer(markdown) {
  return markdownToHwpx(markdown);
}

export function readMarkdownForRestore(inputPath, options) {
  return readMarkdownFromInput(inputPath, options);
}

export function saveHwpxBuffer(outputPath, hwpxArrayBuffer) {
  const resolvedOutput = resolve(outputPath);
  ensureParentDir(resolvedOutput);
  writeFileSync(resolvedOutput, Buffer.from(hwpxArrayBuffer));
  return resolvedOutput;
}

export { EDITABLE_START, EDITABLE_END };
