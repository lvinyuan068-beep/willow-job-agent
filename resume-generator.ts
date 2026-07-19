import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  LevelFormat,
  PageNumber,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx";

const PROFILE_KEYS = [
  "AIGC_CONTENT_OPERATIONS",
  "AI_DATA_OR_MULTIMODAL_EVALUATION",
  "AI_PRODUCT_OPERATIONS",
  "AI_APPLICATION_OPERATIONS",
  "GENERAL_OPERATIONS",
] as const;

export type ResumeProfileKey =
  (typeof PROFILE_KEYS)[number];

interface Candidate {
  name: string;
  englishName: string;
  phone: string;
  email: string;
  origin: string;
  portfolioUrl: string;
}

interface Education {
  school: string;
  major: string;
  degree: string;
  period: string;
  level: string;
  source: string;
}

interface ContentBlock {
  id: string;
  section:
    | "experience"
    | "project"
    | "skill";

  title: string;
  text: string;
  level: string;
  source: string;
  tags: ResumeProfileKey[];
}

interface ResumeProfileData {
  schemaVersion: string;
  updatedAt: string;
  candidate: Candidate;
  education: Education;
  contentBlocks: ContentBlock[];

  profilePriority:
    Record<ResumeProfileKey, string[]>;

  blockedClaims: string[];
}

export interface GenerateResumeInput {
  profile: ResumeProfileKey;
  jobTitle: string;
  companyName: string;
  outputDirectory?: string;
}

export interface GeneratedResume {
  profile: ResumeProfileKey;
  docxPath: string;
  auditPath: string;
  selectedBlockIds: string[];
  blockedClaimHits: string[];
}

const PROFILE_LABELS:
  Record<ResumeProfileKey, string> = {
    AIGC_CONTENT_OPERATIONS:
      "AIGC内容运营",

    AI_DATA_OR_MULTIMODAL_EVALUATION:
      "AI数据运营 / 多模态内容测评",

    AI_PRODUCT_OPERATIONS:
      "AI产品运营",

    AI_APPLICATION_OPERATIONS:
      "AI应用运营",

    GENERAL_OPERATIONS:
      "用户 / 活动运营",
  };

/*
 * 版式规则：
 * compact_reference_guide 的中文简历定向覆盖。
 *
 * 页面改为国内常用 A4；
 * 中文字体为 Microsoft YaHei；
 * 正文 9.5pt；
 * 内容控制在 1 至 2 页；
 * 使用真实 Word 项目符号。
 */
const FONT = {
  ascii: "Arial",
  hAnsi: "Arial",
  eastAsia: "Microsoft YaHei",
  cs: "Arial",
} as const;

const COLORS = {
  ink: "17201E",
  accent: "1F6F59",
  muted: "68716F",
  line: "B9C9C2",
};

const PROJECT_DATES:
  Record<string, string> = {
    PROJECT_JOB_AGENT:
      "2026.07",

    PROJECT_JOB_AGENT_EVAL:
      "2026.07",

    PROJECT_TENCENT:
      "2026.01 - 2026.02",

    PROJECT_FREE_NOTE:
      "2026.06 - 2026.07",

    PROJECT_AV_EVALUATION:
      "2026.07",

    PROJECT_GENSHIN:
      "2026.06",
  };

function assertProfileKey(
  value: string,
): asserts value is ResumeProfileKey {
  if (
    !PROFILE_KEYS.includes(
      value as ResumeProfileKey,
    )
  ) {
    throw new Error(
      `未知简历方向：${value}。`,
    );
  }
}

function readProfileData(
  projectRoot: string,
): ResumeProfileData {
  const profilePath = resolve(
    projectRoot,
    "data",
    "resume-profile.json",
  );

  const raw = readFileSync(
    profilePath,
    "utf8",
  );

  const data =
    JSON.parse(raw) as ResumeProfileData;

  if (
    data.schemaVersion !== "1.0" ||
    !Array.isArray(data.contentBlocks) ||
    !Array.isArray(data.blockedClaims)
  ) {
    throw new Error(
      "resume-profile.json 结构不正确。",
    );
  }

  return data;
}

function unique<T>(
  values: T[],
): T[] {
  return [...new Set(values)];
}

function orderedBlocks(
  data: ResumeProfileData,
  profile: ResumeProfileKey,
): ContentBlock[] {
  const preferredIds =
    data.profilePriority[profile] ?? [];

  const taggedIds =
    data.contentBlocks
      .filter(
        (block) =>
          block.tags.includes(profile),
      )
      .map((block) => block.id);

  const orderedIds =
    unique([
      ...preferredIds,
      ...taggedIds,
    ]);

  const byId =
    new Map(
      data.contentBlocks.map(
        (block) =>
          [block.id, block] as const,
      ),
    );

  return orderedIds
    .map((id) => byId.get(id))
    .filter(
      (
        block,
      ): block is ContentBlock =>
        Boolean(block),
    );
}

function selectResumeBlocks(
  data: ResumeProfileData,
  profile: ResumeProfileKey,
): ContentBlock[] {
  const ordered =
    orderedBlocks(data, profile);

  const experience =
    ordered
      .filter(
        (block) =>
          block.section ===
          "experience",
      )
      .slice(0, 4);

  const projects =
    ordered
      .filter(
        (block) =>
          block.section ===
          "project",
      )
      .slice(0, 3);

  const skills =
    ordered
      .filter(
        (block) =>
          block.section ===
          "skill",
      )
      .slice(0, 4);

  return [
    ...experience,
    ...projects,
    ...skills,
  ];
}

function resumeSafeText(
  value: string,
): string {
  return value
    .replace(
      "；不将该结果包装为正式审计满意度。",
      "。",
    )
    .replace(
      "；不主张SQL或统计建模能力。",
      "。",
    )
    .replace(
      "，不主张独立编程能力。",
      "。",
    );
}

function safeFilenamePart(
  value: string,
  fallback: string,
): string {
  const cleaned = value
    .trim()
    .replace(
      /[<>:"/\\|?*\u0000-\u001F]/g,
      "-",
    )
    .replace(/\s+/g, "")
    .replace(/-+/g, "-")
    .slice(0, 36);

  return cleaned || fallback;
}

function bodyRun(
  text: string,
  options: {
    bold?: boolean;
    color?: string;
    size?: number;
  } = {},
): TextRun {
  return new TextRun({
    text,
    font: FONT,
    size: options.size ?? 19,
    bold: options.bold ?? false,
    color: options.color ?? COLORS.ink,
  });
}

function sectionHeading(
  text: string,
): Paragraph {
  return new Paragraph({
    style: "ResumeSection",
    children: [
      bodyRun(
        text,
        {
          bold: true,
          size: 23,
          color: COLORS.accent,
        },
      ),
    ],
  });
}

function entityHeading(
  title: string,
  date: string,
): Paragraph {
  return new Paragraph({
    style: "ResumeEntity",

    tabStops: [
      {
        type: TabStopType.RIGHT,
        position: TabStopPosition.MAX,
      },
    ],

    children: [
      bodyRun(
        title,
        {
          bold: true,
          size: 20,
        },
      ),

      bodyRun(
        `\t${date}`,
        {
          size: 18,
          color: COLORS.muted,
        },
      ),
    ],
  });
}

function smallLine(
  text: string,
  bold = false,
): Paragraph {
  return new Paragraph({
    spacing: {
      before: 0,
      after: 35,
      line: 240,
    },

    children: [
      bodyRun(
        text,
        {
          bold,
          size: 18,
          color: bold
            ? COLORS.ink
            : COLORS.muted,
        },
      ),
    ],
  });
}

function bulletParagraph(
  text: string,
): Paragraph {
  return new Paragraph({
    numbering: {
      reference: "resume-bullets",
      level: 0,
    },

    spacing: {
      before: 0,
      after: 35,
      line: 245,
    },

    widowControl: true,

    children: [
      bodyRun(
        resumeSafeText(text),
        {
          size: 19,
        },
      ),
    ],
  });
}

function createFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment:
          AlignmentType.RIGHT,

        spacing: {
          before: 0,
          after: 0,
        },

        children: [
          new TextRun({
            font: FONT,
            size: 16,
            color: COLORS.muted,

            children: [
              "第 ",
              PageNumber.CURRENT,
              " 页",
            ],
          }),
        ],
      }),
    ],
  });
}

function buildResumeDocument(
  data: ResumeProfileData,
  selectedBlocks: ContentBlock[],
  input: GenerateResumeInput,
): Document {
  const experience =
    selectedBlocks.filter(
      (block) =>
        block.section === "experience",
    );

  const projects =
    selectedBlocks.filter(
      (block) =>
        block.section === "project",
    );

  const skills =
    selectedBlocks.filter(
      (block) =>
        block.section === "skill",
    );

  const targetTitle =
    input.jobTitle.trim() ||
    PROFILE_LABELS[input.profile];

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment:
        AlignmentType.CENTER,

      spacing: {
        before: 0,
        after: 30,
      },

      children: [
        bodyRun(
          data.candidate.name,
          {
            bold: true,
            size: 44,
            color: COLORS.ink,
          },
        ),
      ],
    }),
  );

  children.push(
    new Paragraph({
      alignment:
        AlignmentType.CENTER,

      spacing: {
        before: 0,
        after: 25,
      },

      children: [
        bodyRun(
          `${data.candidate.englishName}  |  ` +
          `${data.candidate.phone}  |  ` +
          `${data.candidate.email}  |  ` +
          `籍贯：${data.candidate.origin}`,
          {
            size: 18,
            color: COLORS.muted,
          },
        ),
      ],
    }),
  );

  children.push(
    new Paragraph({
      alignment:
        AlignmentType.CENTER,

      spacing: {
        before: 0,
        after: 75,
      },

      children: [
        bodyRun(
          `求职方向：${targetTitle}`,
          {
            bold: true,
            size: 20,
            color: COLORS.accent,
          },
        ),
      ],
    }),
  );

  children.push(
    sectionHeading("教育背景"),
  );

  children.push(
    entityHeading(
      data.education.school,
      data.education.period,
    ),
  );

  children.push(
    smallLine(
      `${data.education.major} | ` +
      `${data.education.degree}`,
      true,
    ),
  );

  children.push(
    sectionHeading("实习经历"),
  );

  children.push(
    entityHeading(
      "索迪斯（中国）管理咨询有限公司 | 华为青浦园区专项项目",
      "2026.03 - 2026.06",
    ),
  );

  children.push(
    smallLine(
      "产品运营实习生",
      true,
    ),
  );

  for (
    const block
    of experience
  ) {
    children.push(
      bulletParagraph(
        `${block.title}：${block.text}`,
      ),
    );
  }

  if (projects.length > 0) {
    children.push(
      sectionHeading("项目与作品"),
    );

    for (
      const block
      of projects
    ) {
      children.push(
        entityHeading(
          block.title,
          PROJECT_DATES[block.id] ??
          "2026",
        ),
      );

      children.push(
        bulletParagraph(block.text),
      );
    }
  }

  if (skills.length > 0) {
    children.push(
      sectionHeading("核心能力"),
    );

    for (
      const block
      of skills
    ) {
      children.push(
        bulletParagraph(
          `${block.title}：${block.text}`,
        ),
      );
    }
  }

  children.push(
    sectionHeading("作品集"),
  );

  children.push(
    new Paragraph({
      spacing: {
        before: 0,
        after: 0,
        line: 240,
      },

      children: [
        bodyRun(
          data.candidate.portfolioUrl,
          {
            size: 17,
            color: COLORS.accent,
          },
        ),
      ],
    }),
  );

  return new Document({
    creator:
      data.candidate.name,

    title:
      `${data.candidate.name}-${targetTitle}`,

    subject:
      `${input.companyName}-${targetTitle}`,

    description:
      "由Willow Job Agent依据证据库生成的岗位定向简历。",

    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: 19,
            color: COLORS.ink,
          },

          paragraph: {
            spacing: {
              before: 0,
              after: 40,
              line: 245,
            },
          },
        },
      },

      paragraphStyles: [
        {
          id: "ResumeSection",
          name: "Resume Section",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,

          run: {
            font: FONT,
            size: 23,
            bold: true,
            color: COLORS.accent,
          },

          paragraph: {
            spacing: {
              before: 110,
              after: 55,
              line: 260,
            },

            keepNext: true,

            border: {
              bottom: {
                style:
                  BorderStyle.SINGLE,

                color: COLORS.line,
                size: 6,
                space: 2,
              },
            },
          },
        },

        {
          id: "ResumeEntity",
          name: "Resume Entity",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,

          run: {
            font: FONT,
            size: 20,
            bold: true,
            color: COLORS.ink,
          },

          paragraph: {
            spacing: {
              before: 40,
              after: 25,
              line: 245,
            },

            keepNext: true,
          },
        },
      ],
    },

    numbering: {
      config: [
        {
          reference:
            "resume-bullets",

          levels: [
            {
              level: 0,
              format:
                LevelFormat.BULLET,

              text: "•",

              alignment:
                AlignmentType.LEFT,

              style: {
                run: {
                  font: FONT,
                  size: 18,
                  color:
                    COLORS.accent,
                },

                paragraph: {
                  indent: {
                    left: 360,
                    hanging: 180,
                  },

                  spacing: {
                    after: 35,
                    line: 245,
                  },
                },
              },
            },
          ],
        },
      ],
    },

    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
            },

            margin: {
              top: 720,
              right: 850,
              bottom: 720,
              left: 850,
              header: 360,
              footer: 360,
            },
          },
        },

        footers: {
          default:
            createFooter(),
        },

        children,
      },
    ],
  });
}

export async function generateResume(
  input: GenerateResumeInput,
): Promise<GeneratedResume> {
  const projectRoot =
    process.cwd();

  assertProfileKey(
    input.profile,
  );

  const data =
    readProfileData(projectRoot);

  const selectedBlocks =
    selectResumeBlocks(
      data,
      input.profile,
    );

  const selectedCorpus =
    selectedBlocks
      .map(
        (block) =>
          `${block.title}\n${block.text}`,
      )
      .join("\n");

  const blockedClaimHits =
    data.blockedClaims.filter(
      (claim) =>
        selectedCorpus.includes(claim),
    );

  if (
    blockedClaimHits.length > 0
  ) {
    throw new Error(
      "检测到禁止写入简历的表述：" +
      blockedClaimHits.join("；"),
    );
  }

  const document =
    buildResumeDocument(
      data,
      selectedBlocks,
      input,
    );

  const outputDirectory =
    input.outputDirectory
      ? resolve(
          projectRoot,
          input.outputDirectory,
        )
      : resolve(
          projectRoot,
          "outputs",
          "resumes",
        );

  mkdirSync(
    outputDirectory,
    {
      recursive: true,
    },
  );

  const date =
    new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");

  const company =
    safeFilenamePart(
      input.companyName,
      "未命名公司",
    );

  const role =
    safeFilenamePart(
      input.jobTitle,
      PROFILE_LABELS[input.profile],
    );

  const baseName =
    `${date}_${company}_${role}`;

  const docxPath =
    resolve(
      outputDirectory,
      `${baseName}.docx`,
    );

  const auditPath =
    resolve(
      outputDirectory,
      `${baseName}.audit.json`,
    );

  const buffer =
    await Packer.toBuffer(
      document,
    );

  writeFileSync(
    docxPath,
    buffer,
  );

  const audit = {
    schemaVersion: "1.0",
    generatedAt:
      new Date().toISOString(),

    profile:
      input.profile,

    jobTitle:
      input.jobTitle,

    companyName:
      input.companyName,

    originalFilesModified:
      false,

    selectedBlocks:
      selectedBlocks.map(
        (block) => ({
          id: block.id,
          section: block.section,
          title: block.title,
          evidenceLevel:
            block.level,
          evidenceSource:
            block.source,
          generatedText:
            resumeSafeText(
              block.text,
            ),
        }),
      ),

    blockedClaimsChecked:
      data.blockedClaims,

    blockedClaimHits,
  };

  writeFileSync(
    auditPath,
    `${JSON.stringify(
      audit,
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    profile:
      input.profile,

    docxPath,
    auditPath,

    selectedBlockIds:
      selectedBlocks.map(
        (block) => block.id,
      ),

    blockedClaimHits,
  };
}

async function runCli(): Promise<void> {
  const rawProfile =
    process.argv[2] ??
    "AIGC_CONTENT_OPERATIONS";

  assertProfileKey(
    rawProfile,
  );

  const jobTitle =
    process.argv[3] ??
    PROFILE_LABELS[rawProfile];

  const companyName =
    process.argv[4] ??
    "测试公司";

  const result =
    await generateResume({
      profile:
        rawProfile,

      jobTitle,
      companyName,
    });

  console.log("");
  console.log(
    "简历生成成功",
  );

  console.log(
    `方向：${result.profile}`,
  );

  console.log(
    `Word：${result.docxPath}`,
  );

  console.log(
    `审计：${result.auditPath}`,
  );

  console.log(
    "使用证据块：" +
    result.selectedBlockIds.join(", "),
  );

  console.log(
    "禁止表述命中：" +
    result.blockedClaimHits.length,
  );

  console.log("");
}

if (
  require.main === module
) {
  runCli().catch(
    (error: unknown) => {
      console.error(
        error instanceof Error
          ? error.message
          : String(error),
      );

      process.exitCode = 1;
    },
  );
}