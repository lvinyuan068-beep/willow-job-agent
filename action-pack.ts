import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import {
  JobAnalysisOutputSchema,
  JobInputSchema,
  type JobAnalysisOutput,
  type JobInput,
} from "./contracts.js";

import {
  buildCrmSpecificAnswer,
  buildSpecializedExecutionGuide,
} from "./action-pack-specialists.js";

import {
  buildProfessionalResume,
  type ResumeClaimAudit,
} from "./resume-packaging.js";

import {
  auditInterviewAnswers,
  classifyInterviewIntent,
  type AuditedInterviewAnswer,
} from "./interview-intent.js";

import {
  buildHighPriorityInterviewAnswer,
} from "./interview-specialists-v2.js";

type ProfileKey =
  | "AIGC_CONTENT_OPERATIONS"
  | "AI_DATA_OR_MULTIMODAL_EVALUATION"
  | "AI_PRODUCT_OPERATIONS"
  | "AI_APPLICATION_OPERATIONS"
  | "GENERAL_OPERATIONS";

interface Candidate {
  name: string;
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
  tags: ProfileKey[];
}

interface ResumeProfileData {
  schemaVersion: string;
  candidate: Candidate;
  education: Education;
  contentBlocks: ContentBlock[];
  profilePriority:
    Record<string, string[]>;
  blockedClaims: string[];
}

export interface ResumeTextPack {
  profile: ProfileKey;
  targetRole: string;
  jdKeywords: string[];
  summary: string;
  copyReadyText: string;
  sourceBlockIds: string[];
  changeSummary: string[];
  evidenceBoundaries: string[];
  packagingMode:
    | "PROFESSIONAL"
    | "EVIDENCE_ASSEMBLY";
  claimAudit: ResumeClaimAudit[];
}

export interface InterviewAnswerDraft {
  question: string;
  answer: string;
  evidence: string[];
  followUps: string[];
  cautions: string[];
}

export interface ExecutionGuide {
  id: string;
  title: string;
  priority: "P0" | "P1" | "P2";
  recommendedFormat: string;
  estimatedHours: number;
  reason: string;
  steps: string[];
  deliverableTemplate: string;
  acceptanceCriteria: string[];
}

export interface ApplicationActionPack {
  schemaVersion: "1.0";
  generatedAt: string;
  jobTitle: string;
  companyName: string;
  resume: ResumeTextPack;
  interviewAnswers:
    AuditedInterviewAnswer[];
  executionGuides:
    ExecutionGuide[];
}

const PROFILE_SUMMARIES:
  Record<ProfileKey, string> = {
    AIGC_CONTENT_OPERATIONS:
      "2026届影视摄影与制作本科毕业生，具备AIGC图片与视频生成、音视频质量评测、内容分析和批量审核实践。能够结合视听语言基础定位生成内容问题，并使用结构化方式记录迭代过程。",

    AI_DATA_OR_MULTIMODAL_EVALUATION:
      "2026届本科毕业生，具备AIGC音视频质量评测、批量工单审核、问题分类和结构化汇报实践。能够从提示词匹配、画面质量、运动连续性和音画一致性等维度定位问题。",

    AI_PRODUCT_OPERATIONS:
      "2026届本科毕业生，具备用户需求分析、BRD与PRD、MVP设计、用户反馈处理和运营数据整理实践。能够在AI辅助下将业务问题拆解为功能、流程、指标和验收标准。",

    AI_APPLICATION_OPERATIONS:
      "2026届本科毕业生，具备AI应用研究、Agent产品设计、规则测试和本地网页运行实践。能够在AI与教程辅助下完成需求拆解、工作流设计、测试复盘和迭代记录。",

    GENERAL_OPERATIONS:
      "2026届本科毕业生，具备用户活动执行、问卷与工单数据整理、用户反馈处理和跨部门推进实践。能够从用户问题与运营数据中归纳重点，并形成结构化汇报和行动建议。",
  };

const KEYWORD_DICTIONARY = [
  "用户运营",
  "会员运营",
  "用户分层",
  "生命周期",
  "复购",
  "积分体系",
  "邮件营销",
  "用户增长",
  "活动运营",
  "内容运营",
  "数据分析",
  "用户反馈",
  "用户访谈",
  "需求分析",
  "PRD",
  "MVP",
  "AIGC",
  "内容评测",
  "质量审核",
  "提示词",
  "跨部门协作",
  "Excel",
  "CRM",
];

function unique<T>(
  values: T[],
): T[] {
  return [...new Set(values)];
}

function readProfileData():
  ResumeProfileData {
  const path = resolve(
    process.cwd(),
    "data",
    "resume-profile.json",
  );

  const data =
    JSON.parse(
      readFileSync(path, "utf8"),
    ) as ResumeProfileData;

  if (
    data.schemaVersion !== "1.0" ||
    !Array.isArray(
      data.contentBlocks,
    ) ||
    !Array.isArray(
      data.blockedClaims,
    )
  ) {
    throw new Error(
      "resume-profile.json 结构不正确。",
    );
  }

  return data;
}

function resolveProfile(
  analysis: JobAnalysisOutput,
  data: ResumeProfileData,
): ProfileKey {
  const requested =
    analysis.resumeBaseVersion;

  if (
    requested !== "NONE" &&
    requested in
      data.profilePriority
  ) {
    return requested as ProfileKey;
  }

  if (
    analysis.actualRole.includes(
      "AIGC",
    )
  ) {
    return "AIGC_CONTENT_OPERATIONS";
  }

  if (
    analysis.actualRole.includes(
      "产品",
    )
  ) {
    return "AI_PRODUCT_OPERATIONS";
  }

  return "GENERAL_OPERATIONS";
}

function selectedBlocks(
  data: ResumeProfileData,
  profile: ProfileKey,
): ContentBlock[] {
  const preferred =
    data.profilePriority[profile] ??
    [];

  const tagged =
    data.contentBlocks
      .filter(
        (block) =>
          block.tags.includes(profile),
      )
      .map((block) => block.id);

  const orderedIds =
    unique([
      ...preferred,
      ...tagged,
    ]);

  const byId = new Map(
    data.contentBlocks.map(
      (block) =>
        [block.id, block] as const,
    ),
  );

  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter(
      (
        block,
      ): block is ContentBlock =>
        Boolean(block),
    );

  const take = (
    section: ContentBlock["section"],
    maximum: number,
  ) =>
    ordered
      .filter(
        (block) =>
          block.section === section,
      )
      .slice(0, maximum);

  return [
    ...take("experience", 4),
    ...take("project", 3),
    ...take("skill", 4),
  ];
}

function safeResumeText(
  value: string,
): string {
  return value
    .replace(
      "；不主张SQL或统计建模能力。",
      "。",
    )
    .replace(
      "，不主张独立编程能力。",
      "。",
    );
}

function extractKeywords(
  input: JobInput,
  analysis: JobAnalysisOutput,
): string[] {
  const corpus = [
    input.jobTitle ?? "",
    input.jobDescription ?? "",
    analysis.actualRole,
  ].join("\n");

  const matched =
    KEYWORD_DICTIONARY.filter(
      (keyword) =>
        corpus
          .toLowerCase()
          .includes(
            keyword.toLowerCase(),
          ),
    );

  return matched.length > 0
    ? matched
    : [analysis.actualRole];
}

function buildResumeText(
  input: JobInput,
  analysis: JobAnalysisOutput,
  data: ResumeProfileData,
  profile: ProfileKey,
  blocks: ContentBlock[],
): ResumeTextPack {
  const targetRole =
    input.jobTitle ??
    analysis.actualRole;

  const experience = blocks.filter(
    (block) =>
      block.section ===
      "experience",
  );

  const projects = blocks.filter(
    (block) =>
      block.section ===
      "project",
  );

  const skills = blocks.filter(
    (block) =>
      block.section === "skill",
  );

  const jdKeywords =
    extractKeywords(
      input,
      analysis,
    );

  const professionalResume =
    buildProfessionalResume({
      profile,
      targetRole,
      jdKeywords,
      candidate: data.candidate,
      education: data.education,
      contentBlocks:
        data.contentBlocks,
      blockedClaims:
        data.blockedClaims,
    });

  if (professionalResume) {
    return {
      profile,
      targetRole:
        professionalResume.displayRole,
      jdKeywords,
      summary:
        professionalResume.summary,
      copyReadyText:
        professionalResume.copyReadyText,
      sourceBlockIds:
        professionalResume.sourceBlockIds,
      changeSummary: unique([
        ...analysis.resumeEdits.map(
          (item) =>
            `${item.section}：` +
            item.instruction,
        ),
        ...professionalResume
          .packagingNotes,
      ]),
      evidenceBoundaries: unique(
        analysis
          .interviewPreparation
          .claimsToAvoid,
      ),
      packagingMode: "PROFESSIONAL",
      claimAudit:
        professionalResume.claimAudit,
    };
  }

  const bullet = (
    block: ContentBlock,
  ) =>
    `• ${block.title}：` +
    safeResumeText(block.text);

  const lines = [
    data.candidate.name,
    [
      data.candidate.phone,
      data.candidate.email,
      `籍贯：${data.candidate.origin}`,
    ].join("｜"),

    `求职方向：${targetRole}`,
    "",

    "个人定位",
    PROFILE_SUMMARIES[profile],
    "",

    "实习经历",
    "索迪斯（中国）管理咨询有限公司｜华为青浦园区专项项目",
    "产品运营实习生｜2026.03 - 2026.06",
    ...experience.map(bullet),
    "",

    "项目与作品",
    ...projects.map(bullet),
    "",

    "核心能力",
    ...skills.map(bullet),
    "",

    "教育背景",
    `${data.education.school}｜${data.education.major}｜${data.education.degree}`,
    data.education.period,
    "",

    "作品集",
    data.candidate.portfolioUrl,
  ];

  const copyReadyText =
    lines.join("\n").trim();

  const blockedHits =
    data.blockedClaims.filter(
      (claim) =>
        copyReadyText.includes(claim),
    );

  const unsafeOwnership =
    /(?:独立负责|主导).*(?:美食品鉴|园区活动|满意度调研)/.test(
      copyReadyText,
    );

  if (
    blockedHits.length > 0 ||
    unsafeOwnership
  ) {
    throw new Error(
      "执行包简历文本命中禁止表述：" +
      [
        ...blockedHits,
        ...(unsafeOwnership
          ? [
              "未经证据支持的独立负责或主导活动表述",
            ]
          : []),
      ].join("；"),
    );
  }

  return {
    profile,
    targetRole,
    jdKeywords:
      extractKeywords(
        input,
        analysis,
      ),

    summary:
      PROFILE_SUMMARIES[profile],

    copyReadyText,

    sourceBlockIds:
      blocks.map(
        (block) => block.id,
      ),

    changeSummary:
      analysis.resumeEdits.map(
        (item) =>
          `${item.section}：` +
          item.instruction,
      ),

    evidenceBoundaries:
      analysis
        .interviewPreparation
        .claimsToAvoid,

    packagingMode: "EVIDENCE_ASSEMBLY",
    claimAudit: [],
  };
}

function interviewQuestionKey(
  question: string,
): string {
  const intent =
    classifyInterviewIntent(
      question,
    );

  if (intent !== "GENERAL") {
    return `INTENT:${intent}`;
  }

  return (
    "TEXT:" +
    question
      .replace(/\s+/g, "")
      .toLowerCase()
  );
}

function questionList(
  input: JobInput,
  analysis: JobAnalysisOutput,
): string[] {
  const role =
    input.jobTitle ??
    analysis.actualRole;

  const candidates = [
    "请做一个60秒自我介绍。",
    `为什么申请${role}？`,

    ...analysis
      .interviewPreparation
      .likelyQuestions,

    "你有哪些与岗位直接相关的证据？",
    "你如何分析用户反馈或运营数据？",
    "请介绍一次活动执行经历。",
    "请介绍一次客诉或复杂问题处理经历。",
    "你目前最明显的能力缺口是什么？",
    "你如何理解这个岗位的核心目标？",
  ];

  const seen =
    new Set<string>();

  return candidates
    .filter((question) => {
      const key =
        interviewQuestionKey(
          question,
        );

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function answerDraft(
  question: string,
  input: JobInput,
  analysis: JobAnalysisOutput,
): InterviewAnswerDraft {
  const role =
    input.jobTitle ??
    analysis.actualRole;

  const commonCautions = [
    "不使用65%到32%的精确KPI。",
    "不使用93%或100%满意度。",
    "不把团队结果描述为个人独立完成。",
  ];

  const highPriorityAnswer =
    buildHighPriorityInterviewAnswer(
      question,
      input,
      analysis,
    );

  if (highPriorityAnswer) {
    return highPriorityAnswer;
  }

  const specializedAnswer =
    buildCrmSpecificAnswer(
      question,
    );

  if (specializedAnswer) {
    return specializedAnswer;
  }

  if (
    question.includes("自我介绍")
  ) {
    return {
      question,

      answer:
        `您好，我叫吕沁远，是2026届影视摄影与制作本科毕业生。我在索迪斯华为青浦园区项目中参与用户活动、问卷回收、工单审核和客诉跟进，其中审核过2000+条工单，也参与了触达800+人的美食品鉴系列活动。除了运营实践，我还完成了AI产品研究、AIGC音视频评测和本地求职Agent项目。目前我希望应聘${role}，把用户理解、数据整理和AI工具能力用于更具体的业务场景。`,

      evidence: [
        "2000+条工单审核",
        "活动触达800+",
        "AI产品与Agent项目",
      ],

      followUps: [
        "为什么从影视方向转向运营？",
        "哪一段经历最能证明岗位匹配？",
      ],

      cautions:
        commonCautions,
    };
  }

  if (
    question.includes("为什么") &&
    question.includes("申请")
  ) {
    return {
      question,

      answer:
        `我申请${role}主要有三个原因。第一，岗位需要理解用户并根据反馈优化运营动作，这和我参与活动、问卷、工单及客诉跟进的经历相符。第二，我习惯把复杂信息整理成结构化结论，并愿意持续学习新的系统和工具。第三，我希望进入能够同时接触用户、数据和产品协作的岗位。对于我还没有正式做过的CRM或会员体系部分，我会如实说明，并通过案例拆解和工具练习尽快补齐。`,

      evidence: [
        "用户活动与问卷",
        "工单分析",
        "结构化汇报",
      ],

      followUps: [
        "你为什么选择我们公司？",
        "如果工作包含重复任务，你能否接受？",
      ],

      cautions:
        commonCautions,
    };
  }

  if (
    question.includes("证据") ||
    question.includes("优势")
  ) {
    return {
      question,

      answer:
        "我与岗位直接相关的证据主要有三类。第一是用户触达，我参与美食品鉴系列活动落地和现场讲解，系列活动触达800+人，个人新增65名活动用户微信。第二是数据与审核，我在借调品质部门期间审核2000+条工单，并按问题类型核查异常、总结检查方法。第三是问题推进，我跟进过一宗设施安全客诉，负责员工沟通、跨部门升级和约两周进度追踪。这些经历证明我能够接触用户、整理信息并推动问题继续向前。",

      evidence: [
        "EXP_ACTIVITY_800",
        "EXP_TICKET_2000",
        "EXP_COMPLAINT_CASE",
      ],

      followUps: [
        "800+触达中你的个人贡献是什么？",
        "工单审核具体如何分类？",
      ],

      cautions:
        commonCautions,
    };
  }

  if (
    question.includes("数据") ||
    question.includes("分析")
  ) {
    return {
      question,

      answer:
        "我目前的数据分析以Excel、数据透视和结构化归纳为主。借调品质部门期间，我审核了2000+条工单，先按问题类型和异常表现进行分类，再通过批量检查定位高频问题，并把检查方法整理成个人流程。我的优势是能够从大量信息中找出需要优先关注的部分；需要说明的是，我目前不主张SQL或统计建模能力。",

      evidence: [
        "2000+条工单审核",
        "Excel与数据透视",
        "个人检查流程总结",
      ],

      followUps: [
        "你如何定义高频问题？",
        "如果数据缺失你会怎么办？",
      ],

      cautions: [
        ...commonCautions,
        "不声称掌握SQL或统计建模。",
      ],
    };
  }

  if (
    question.includes("活动")
  ) {
    return {
      question,

      answer:
        "在华为青浦园区项目中，我参与美食品鉴系列活动的落地和现场讲解。我的具体工作包括向员工介绍活动规则、说明报名和体验渠道、回答现场问题并完成用户触达。系列活动累计触达800+人，我个人新增65名活动用户微信。这段经历让我理解，活动执行不仅是现场热闹，还要让用户清楚活动价值、参与路径和后续沟通方式。",

      evidence: [
        "活动触达800+",
        "个人新增65名活动用户微信",
      ],

      followUps: [
        "活动效果如何衡量？",
        "如果现场参与度低怎么办？",
      ],

      cautions: [
        ...commonCautions,
        "必须使用“参与”，不能说独立负责或主导活动。",
      ],
    };
  }

  if (
    question.includes("客诉") ||
    question.includes("投诉") ||
    question.includes("反馈")
  ) {
    return {
      question,

      answer:
        "我跟进过一宗设施安全客诉。员工在使用残疾人卫生间扶手时再次摔倒，我负责与员工沟通、确认诉求、同步处理进度，并把问题升级到相关部门。事件持续约两周，我的职责是沟通、记录和推进，不负责最终定责、赔付或设施决策。这次经历让我认识到，处理客诉既要关注流程，也要让用户明确感受到问题正在被重视和推进。",

      evidence: [
        "约两周客诉跟进",
        "员工沟通",
        "跨部门升级",
      ],

      followUps: [
        "如果责任部门不配合怎么办？",
        "如何安抚情绪激动的用户？",
      ],

      cautions: [
        ...commonCautions,
        "不得描述为个人完成定责、赔付和闭环。",
      ],
    };
  }

  if (
    question.includes("会员") ||
    question.includes("CRM") ||
    question.includes("复购") ||
    question.includes("邮件")
  ) {
    return {
      question,

      answer:
        "我目前没有独立负责CRM、会员体系或邮件营销的正式任职经历。我的理解是，这类工作的核心不是单纯发送活动，而是根据用户阶段和行为进行分层，设计对应触达内容，再观察活跃、复购或留存变化。我已经具备用户沟通、活动执行和数据整理基础，下一步会通过拆解真实品牌会员体系和练习CRM工具流程补齐这一部分。",

      evidence: [
        "用户活动执行",
        "工单与问卷整理",
        "短期CRM学习计划",
      ],

      followUps: [
        "你会如何设计会员分层？",
        "你了解哪些CRM指标？",
      ],

      cautions: [
        ...commonCautions,
        "不能虚构CRM系统或邮件营销经验。",
      ],
    };
  }

  if (
    question.includes("缺口") ||
    question.includes("不足") ||
    question.includes("缺点")
  ) {
    return {
      question,

      answer:
        "我目前最明显的缺口是缺少正式的CRM、会员运营或独立负责业务指标的经历。但这个缺口是明确且可以拆解的：先学习常见会员分层、积分和生命周期逻辑，再完成1到2个品牌案例拆解，并熟悉基础CRM工具流程。我不会把未做过的内容包装成经验，但可以用可验证的学习产出来证明上手速度。",

      evidence: [
        "真实能力边界",
        "案例拆解能力",
        "项目驱动学习方式",
      ],

      followUps: [
        "你预计多久可以上手？",
        "为什么公司要选择没有直接经验的你？",
      ],

      cautions:
        commonCautions,
    };
  }

  return {
    question,

    answer:
      `我会先确认这个问题对应${role}的哪一项核心职责，再使用具体经历说明。我的回答会按照“任务背景、个人行动、实际结果、能力边界”展开，并优先使用工单审核、活动执行、用户反馈处理和AI项目中的可核验证据。`,

    evidence: [
      "工单审核",
      "活动执行",
      "用户反馈处理",
      "AI项目实践",
    ],

    followUps: [
      "你的个人贡献是什么？",
      "结果如何验证？",
    ],

    cautions:
      commonCautions,
  };
}

function buildExecutionGuides(
  analysis: JobAnalysisOutput,
): ExecutionGuide[] {
  const guides: ExecutionGuide[] = [
    {
      id: "RESUME_TEXT",
      title: "完成岗位定向简历",
      priority: "P0",
      recommendedFormat:
        "本页面可复制文本 → Word/PDF",
      estimatedHours: 1,
      reason:
        "先形成证据安全的正文，再处理排版，避免在旧PDF中继续保留错误数据。",

      steps: [
        "复制定向简历正文。",
        "粘贴到Word现有简历模板。",
        "检查岗位名称、公司名称和关键词。",
        "逐条核对个人贡献与证据边界。",
        "导出一页PDF并检查版面。",
      ],

      deliverableTemplate:
        "文件名：日期_公司_岗位_姓名.pdf\n检查项：岗位方向、个人定位、经历、项目、能力、作品集、联系方式。",

      acceptanceCriteria: [
        "禁止表述命中为0。",
        "正文控制在1页优先、最多2页。",
        "前三分之一页面出现最相关证据。",
        "HR可在10秒内看到岗位方向和核心能力。",
      ],
    },

    {
      id: "PORTFOLIO_INDEX",
      title: "整理1至3件岗位定向代表作品",
      priority: "P0",
      recommendedFormat:
        "Notion（当前推荐）",
      estimatedHours: 2,
      reason:
        "现有Notion链接可直接复用，完成速度快；独立网站预计需要8至16小时，不应阻塞当前投递。",

      steps: [
        "选择与岗位最相关的1至3件作品。",
        "每件作品补齐任务背景和目标。",
        "列出使用工具与个人贡献。",
        "展示发现的问题和迭代过程。",
        "写明最终产出及证据边界。",
        "生成可直接发给HR的作品索引页。",
      ],

      deliverableTemplate:
        "作品名称：\n目标岗位：\n任务背景：\n使用工具：\n个人贡献：\n发现的问题：\n迭代过程：\n最终产出：\n证据或附件：\n不能宣称的内容：",

      acceptanceCriteria: [
        "每件作品均说明个人贡献。",
        "每件作品均包含问题与迭代。",
        "所有链接可正常打开。",
        "不把课程作业包装成正式任职成果。",
      ],
    },
  ];

  for (
    const item of
      analysis.shortTermSkillPlan
  ) {
    const specializedGuide =
      buildSpecializedExecutionGuide(
        item,
      );

    if (specializedGuide) {
      guides.push(
        specializedGuide,
      );

      continue;
    }

    const dataOrEvaluation =
      /数据|评测|多模态|Excel/.test(
        item.skill,
      );

    guides.push({
      id:
        "SKILL_" +
        item.skill
          .replace(/\s+/g, "_")
          .slice(0, 24),

      title: item.skill,
      priority: item.priority,

      recommendedFormat:
        dataOrEvaluation
          ? "Excel明细表 + Notion复盘页"
          : "Notion文档或3至5页PDF",

      estimatedHours:
        item.estimatedHours,

      reason: item.reason,

      steps: [
        "明确该技能对应的岗位要求。",
        "选择一个真实案例或10个样本。",
        "建立统一的分析或评测维度。",
        "完成第一版并记录问题。",
        "根据结果迭代一次。",
        "整理为可在面试中展示的产物。",
      ],

      deliverableTemplate:
        `任务名称：${item.skill}\n岗位要求：\n案例或样本：\n分析维度：\n第一版结果：\n发现的问题：\n迭代动作：\n最终结论：\n附件链接：`,

      acceptanceCriteria: [
        item.verifiableDeliverable,
        "存在可打开的文件或链接。",
        "能够用2分钟说明方法和结论。",
        "明确哪些是学习样本而非任职成果。",
      ],
    });
  }

  return guides;
}

export function buildApplicationActionPack(
  rawInput: JobInput,
  rawAnalysis: JobAnalysisOutput,
): ApplicationActionPack {
  const input =
    JobInputSchema.parse(rawInput);

  const analysis =
    JobAnalysisOutputSchema.parse(
      rawAnalysis,
    );

  const data =
    readProfileData();

  const profile =
    resolveProfile(
      analysis,
      data,
    );

  const blocks =
    selectedBlocks(
      data,
      profile,
    );

  return {
    schemaVersion: "1.0",

    generatedAt:
      new Date().toISOString(),

    jobTitle:
      input.jobTitle ??
      analysis.actualRole,

    companyName:
      input.companyName ??
      "未填写公司",

    resume:
      buildResumeText(
        input,
        analysis,
        data,
        profile,
        blocks,
      ),

    interviewAnswers:
      auditInterviewAnswers(
        questionList(
          input,
          analysis,
        ).map(
          (question) =>
            answerDraft(
              question,
              input,
              analysis,
            ),
        ),
      ),

    executionGuides:
      buildExecutionGuides(
        analysis,
      ),
  };
}
