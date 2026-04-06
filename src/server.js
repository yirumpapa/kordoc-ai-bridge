import { mkdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import express from "express";
import multer from "multer";
import {
  parseDocumentBuffer,
  markdownToHwpxBuffer,
  readMarkdownForRestore,
  EDITABLE_END,
  EDITABLE_START,
} from "./core.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const DEFAULT_PORT = Number(process.env.PORT || 3030);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(resolve("public")));

app.get("/api/health", (_, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.post("/api/extract", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: "file 필드에 파일을 업로드해주세요." });
    }

    const parseOptions = {
      pages: typeof req.body.pages === "string" ? req.body.pages : undefined,
      removeHeaderFooter: req.body.removeHeaderFooter === "true",
    };

    const templateMode = req.body.templateMode === "raw" ? "raw" : "guarded";

    const result = await parseDocumentBuffer({
      fileBuffer: req.file.buffer,
      sourceFile: req.file.originalname,
      parseOptions,
      templateMode,
    });

    return res.json({
      ok: true,
      sourceFile: req.file.originalname,
      sourceFormat: result.sourceFormat,
      aiMarkdown: result.aiMarkdown,
      structuredJson: result.structuredPayload,
      markers: {
        start: EDITABLE_START,
        end: EDITABLE_END,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message ?? "extract 실패" });
  }
});

app.post("/api/restore-markdown", async (req, res) => {
  try {
    const markdown = typeof req.body.markdown === "string" ? req.body.markdown : "";

    if (!markdown.trim()) {
      return res.status(400).json({ ok: false, error: "markdown 본문이 비어 있습니다." });
    }

    const hwpxArrayBuffer = await markdownToHwpxBuffer(markdown);
    const fileBuffer = Buffer.from(hwpxArrayBuffer);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment; filename=restored.hwpx");
    return res.send(fileBuffer);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message ?? "restore 실패" });
  }
});

app.post("/api/restore-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: "file 필드에 .md 또는 .json 파일이 필요합니다." });
    }

    const tempDir = resolve(".tmp");
    mkdirSync(tempDir, { recursive: true });
    const tempName = `${Date.now()}_${basename(req.file.originalname)}`;
    const tempPath = join(tempDir, tempName);

    // Reuse the CLI restore reader logic by writing a temporary file.
    // This keeps JSON/marker parsing behavior consistent between UI and CLI.
    await import("node:fs").then(({ writeFileSync, unlinkSync }) => {
      writeFileSync(tempPath, req.file.buffer);
      const markdown = readMarkdownForRestore(tempPath, {
        strictTemplate: req.body.strictTemplate === "true",
      });
      unlinkSync(tempPath);

      return markdownToHwpxBuffer(markdown).then((hwpxArrayBuffer) => {
        const fileBuffer = Buffer.from(hwpxArrayBuffer);
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", "attachment; filename=restored.hwpx");
        return res.send(fileBuffer);
      });
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message ?? "restore-file 실패" });
  }
});

app.listen(DEFAULT_PORT, () => {
  console.log(`HWP AI Bridge Web UI: http://localhost:${DEFAULT_PORT}`);
});
