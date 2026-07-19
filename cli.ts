import { 
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import {
  JobInputSchema,
  type JobAnalysisOutput,
  type JobInput,
} from "./contracts.js";
import { runJobAgent } from "./researched-agent.js";
import { parseJobText } from "./text-input.js";
const sampleJobs: Record<string, JobInput> = {
  "ai-product": {
    jobTitle: "AI产品运营（应届生）",
    companyName: "示例科技有限公司",
    jobDescription:
      "负责AI产品用户需求收集、用户访谈、PRD协助、活动运营、数据分析和AIGC内容测试。接受应届毕业生，本科及以上，经验不限。入职后签订正式劳动合同并提供五险一金，不涉及销售、陌生开发或直播出镜。",
    sourcePlatform: "本地测试",
    city: "杭州",
    salaryText: "税前8000至10000元",
    workLocation: "杭州市",
    resumeVersion: "AI产品运营",
  },
  "sales-risk": {
    jobTitle: "AI课程顾问",
    companyName: "示例教育科技公司",
    jobDescription:
      "通过电话销售和陌生开发联系客户，完成课程销售额、签单和业绩指标。入职前需参加一个月无薪培训，并缴纳培训服务费。优秀者可进入大厂项目。",
    sourcePlatform: "本地测试",
    city: "杭州",
    salaryText: "底薪3000加销售提成",
    workLocation: "杭州市",
  },
};

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}
function saveOutput(result: JobAnalysisOutput): string {
  const requestedPath =
    argumentValue("--out") ?? "outputs/latest.json";

  const absolutePath = resolve(process.cwd(), requestedPath);

  mkdirSync(dirname(absolutePath), {
    recursive: true,
  });

  writeFileSync(
    absolutePath,
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );

  return absolutePath;
}

function printUsage(): void {
  console.log("Willow Job Agent 2.0 - Offline Mock Mode");
  console.log("");
  console.log("运行内置正常岗位：");
  console.log("  tsx src/cli.ts --sample ai-product");
  console.log("");
  console.log("运行内置风险岗位：");
  console.log("  tsx src/cli.ts --sample sales-risk");
  console.log("");
  console.log("读取自己的 JSON 岗位文件：");
  console.log("  tsx src/cli.ts --file data/job-input.json");
}

function loadInput(): JobInput {
  const sampleName = argumentValue("--sample");
  const filePath = argumentValue("--file");

  if (sampleName) {
    const sample = sampleJobs[sampleName];

    if (!sample) {
      throw new Error(
        `未知测试案例：${sampleName}。可用案例：${Object.keys(
          sampleJobs,
        ).join("、")}`,
      );
    }

    return JobInputSchema.parse(sample);
  }

  if (filePath) {
    const absolutePath = resolve(process.cwd(), filePath);
    const fileContents = readFileSync(absolutePath, "utf8");
    const rawInput: unknown = absolutePath
      .toLowerCase()
      .endsWith(".json")
      ? JSON.parse(fileContents)
      : parseJobText(fileContents);

    return JobInputSchema.parse(rawInput);
  }
  throw new Error("没有提供 --sample 或 --file 参数。");
}

function printFirstScreen(result: JobAnalysisOutput): void {
  console.log("");
  console.log("WILLOW JOB AGENT 2.0");
  console.log(`运行模式：${result.mode.toUpperCase()}`);
  console.log("");

  console.log(`1. 投不投：${result.decision}`);
  console.log(`   ${result.decisionSummary}`);

  console.log("");
  console.log(`2. 是否修改简历：${result.resumeAction}`);
  console.log(`   基础版本：${result.resumeBaseVersion}`);

  console.log("");
  console.log("3. 招呼或回复话术：");
  console.log(
    result.recruiterMessage || "不发送：该岗位已被淘汰。",
  );

  console.log("");
  console.log("4. 面试准备：");
  if (result.decision === "REJECT") {
    console.log("无需准备：该岗位已被硬过滤或综合淘汰。");
  } else {
    for (const question of result.interviewPreparation.likelyQuestions) {
      console.log(`- ${question}`);
    }
  }

  console.log("");
  console.log("5. 短期可补齐技能：");
  if (result.shortTermSkillPlan.length === 0) {
    console.log("- 暂无");
  } else {
    for (const item of result.shortTermSkillPlan) {
      console.log(
        `- ${item.skill}：${item.estimatedHours}小时，产出：${item.verifiableDeliverable}`,
      );
    }
  }

  console.log("");
  console.log(`岗位判断分：${result.rankingScore}/100`);
  console.log(`档位：${result.grade}`);
  console.log(`面试概率分档：${result.interviewProbabilityBand}`);

  console.log("");
  console.log("完整 JSON：");
  console.log(JSON.stringify(result, null, 2));
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    printUsage();
    return;
  }

  const input = loadInput();
  const result = await runJobAgent(input);
  const savedPath = saveOutput(result);

  printFirstScreen(result);

  console.log("");
  console.log(`结果已写入：${savedPath}`);
}

main().catch((error: unknown) => {
  console.error("");
  console.error("运行失败：");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  console.error("");
  printUsage();
  process.exitCode = 1;
});