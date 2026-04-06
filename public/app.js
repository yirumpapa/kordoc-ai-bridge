const dropZone = document.getElementById("dropZone");
const extractFileInput = document.getElementById("extractFile");
const extractBtn = document.getElementById("extractBtn");
const extractStatus = document.getElementById("extractStatus");
const aiMarkdownEl = document.getElementById("aiMarkdown");
const structuredJsonEl = document.getElementById("structuredJson");
const pagesEl = document.getElementById("pages");
const templateModeEl = document.getElementById("templateMode");
const removeHeaderFooterEl = document.getElementById("removeHeaderFooter");

const restoreMarkdownEl = document.getElementById("restoreMarkdown");
const restoreStatus = document.getElementById("restoreStatus");
const restoreFromTextBtn = document.getElementById("restoreFromTextBtn");
const restoreFromFileBtn = document.getElementById("restoreFromFileBtn");
const restoreFileEl = document.getElementById("restoreFile");
const strictTemplateEl = document.getElementById("strictTemplate");

const downloadMdBtn = document.getElementById("downloadMd");
const downloadJsonBtn = document.getElementById("downloadJson");

let selectedExtractFile = null;

function setStatus(el, message, isError = false) {
  el.textContent = message;
  el.classList.remove("ok", "error");
  el.classList.add(isError ? "error" : "ok");
}

function downloadText(filename, text, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBinary(filename, bytes) {
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bindDropZone() {
  dropZone.addEventListener("click", () => extractFileInput.click());

  extractFileInput.addEventListener("change", () => {
    selectedExtractFile = extractFileInput.files?.[0] ?? null;
    dropZone.textContent = selectedExtractFile
      ? `선택 파일: ${selectedExtractFile.name}`
      : "파일을 여기로 드래그하거나 클릭해서 선택하세요.";
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("active");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("active");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("active");
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    selectedExtractFile = file;
    dropZone.textContent = `선택 파일: ${selectedExtractFile.name}`;
  });
}

async function handleExtract() {
  if (!selectedExtractFile) {
    setStatus(extractStatus, "먼저 문서 파일을 선택하세요.", true);
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedExtractFile);
  formData.append("pages", pagesEl.value.trim());
  formData.append("templateMode", templateModeEl.value);
  formData.append("removeHeaderFooter", String(removeHeaderFooterEl.checked));

  setStatus(extractStatus, "변환 중...");

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "extract 실패");
    }

    aiMarkdownEl.value = data.aiMarkdown;
    structuredJsonEl.value = JSON.stringify(data.structuredJson, null, 2);
    restoreMarkdownEl.value = data.aiMarkdown;

    setStatus(extractStatus, `변환 완료: ${data.sourceFile} (${data.sourceFormat})`);
  } catch (error) {
    setStatus(extractStatus, error.message || "변환 중 오류가 발생했습니다.", true);
  }
}

async function handleRestoreFromText() {
  const markdown = restoreMarkdownEl.value;

  if (!markdown.trim()) {
    setStatus(restoreStatus, "복원할 markdown이 비어 있습니다.", true);
    return;
  }

  setStatus(restoreStatus, "HWPX 생성 중...");

  try {
    const response = await fetch("/api/restore-markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "복원 실패");
    }

    const bytes = await response.arrayBuffer();
    downloadBinary("restored.hwpx", bytes);
    setStatus(restoreStatus, "복원 완료: restored.hwpx 다운로드");
  } catch (error) {
    setStatus(restoreStatus, error.message || "복원 중 오류", true);
  }
}

async function handleRestoreFromFile() {
  const file = restoreFileEl.files?.[0];

  if (!file) {
    setStatus(restoreStatus, "복원할 .md 또는 .json 파일을 선택하세요.", true);
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("strictTemplate", String(strictTemplateEl.checked));

  setStatus(restoreStatus, "파일 복원 중...");

  try {
    const response = await fetch("/api/restore-file", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "restore-file 실패");
    }

    const bytes = await response.arrayBuffer();
    downloadBinary("restored.hwpx", bytes);
    setStatus(restoreStatus, "복원 완료: restored.hwpx 다운로드");
  } catch (error) {
    setStatus(restoreStatus, error.message || "복원 중 오류", true);
  }
}

extractBtn.addEventListener("click", handleExtract);
restoreFromTextBtn.addEventListener("click", handleRestoreFromText);
restoreFromFileBtn.addEventListener("click", handleRestoreFromFile);

downloadMdBtn.addEventListener("click", () => {
  if (!aiMarkdownEl.value.trim()) {
    setStatus(extractStatus, "다운로드할 markdown 결과가 없습니다.", true);
    return;
  }
  downloadText("document.ai.md", aiMarkdownEl.value, "text/markdown;charset=utf-8");
});

downloadJsonBtn.addEventListener("click", () => {
  if (!structuredJsonEl.value.trim()) {
    setStatus(extractStatus, "다운로드할 JSON 결과가 없습니다.", true);
    return;
  }
  downloadText("document.structured.json", structuredJsonEl.value, "application/json;charset=utf-8");
});

bindDropZone();
