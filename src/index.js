import { resolve } from "node:path";
import { Command } from "commander";
import {
  extractToFiles,
  markdownToHwpxBuffer,
  readMarkdownForRestore,
  saveHwpxBuffer,
} from "./core.js";

const program = new Command();

function fail(message) {
  console.error(`\n[ERROR] ${message}`);
  process.exit(1);
}

program
  .name("hwp-ai-bridge")
  .description("HWP/HWPX 문서를 AI 친화 형식으로 변환하고, 편집본을 HWPX로 복원합니다.")
  .version("0.1.0");

program
  .command("extract")
  .description("HWP/HWPX/PDF를 AI 친화 문서(.md + .json)로 변환")
  .argument("<input>", "입력 파일 경로 (.hwp/.hwpx/.pdf)")
  .option("-o, --outDir <dir>", "출력 폴더", "./output")
  .option("-n, --name <name>", "출력 파일 베이스 이름 (기본: 입력 파일명)")
  .option("--pages <pages>", "페이지 범위 예: 1-3,5")
  .option("--remove-header-footer", "PDF 반복 머리글/바닥글 제거")
  .option("--template <mode>", "AI 문서 템플릿 모드: guarded|raw", "guarded")
  .action(async (input, options) => {
    const templateMode = options.template === "raw" ? "raw" : "guarded";

    const output = await extractToFiles({
      inputPath: resolve(input),
      outDir: options.outDir,
      name: options.name,
      templateMode,
      parseOptions: {
        pages: options.pages,
        removeHeaderFooter: !!options.removeHeaderFooter,
      },
    });

    console.log("\n[OK] 변환 완료");
    console.log(`- Markdown: ${output.aiMarkdownPath}`);
    console.log(`- Structured JSON: ${output.structuredJsonPath}`);
    console.log("\n다음 단계:");
    console.log("1) .ai.md 파일을 AI와 함께 수정");
    console.log("2) restore 명령으로 .hwpx 복원");
  });

program
  .command("restore")
  .description("편집된 .md 또는 .json(markdown 필드 포함)을 .hwpx 파일로 복원")
  .argument("<input>", "입력 파일 경로 (.md 또는 .json)")
  .option("-o, --output <file>", "출력 HWPX 파일", "./output/restored.hwpx")
  .option("--strict-template", "템플릿 마커(AI_BRIDGE_EDITABLE_START/END) 강제")
  .action(async (input, options) => {
    const markdown = readMarkdownForRestore(resolve(input), {
      strictTemplate: !!options.strictTemplate,
    });

    if (!markdown.trim()) {
      fail("입력 문서가 비어 있습니다.");
    }

    const hwpxArrayBuffer = await markdownToHwpxBuffer(markdown);
    const outputPath = saveHwpxBuffer(options.output, hwpxArrayBuffer);

    console.log("\n[OK] 복원 완료");
    console.log(`- HWPX: ${outputPath}`);
    console.log("\n참고: kordoc은 현재 Markdown -> HWPX 복원을 지원합니다.");
  });

program
  .command("serve")
  .description("드래그앤드롭 웹 UI 서버 실행")
  .option("-p, --port <port>", "서버 포트", "3030")
  .action(async (options) => {
    process.env.PORT = String(options.port);
    await import("./server.js");
  });

program.parseAsync(process.argv).catch((error) => {
  fail(error?.message ?? "알 수 없는 오류가 발생했습니다.");
});
