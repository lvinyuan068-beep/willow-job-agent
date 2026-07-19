import type {
  InterviewAnswerDraft,
} from "./action-pack.js";

import type {
  JobAnalysisOutput,
  JobInput,
} from "./contracts.js";

import {
  classifyInterviewIntent,
} from "./interview-intent.js";

import {
  buildAigcInterviewAnswer,
} from "./interview-aigc-specialists.js";

const COMMON_CAUTIONS = [
  "不使用65%到32%的精确KPI。",
  "不使用93%或100%满意度。",
  "不把团队结果描述为个人独立完成。",
];

function createAnswer(
  question: string,
  answer: string,
  evidence: string[],
  followUps: string[],
  extraCautions: string[] = [],
): InterviewAnswerDraft {
  return {
    question,
    answer,
    evidence,
    followUps,

    cautions: [
      ...COMMON_CAUTIONS,
      ...extraCautions,
    ],
  };
}

function tavilySourceNames(
  analysis: JobAnalysisOutput,
): string[] {
  const sourceLine =
    analysis.limitations.find(
      (item) =>
        item.startsWith(
          "联网来源：",
        ),
    );

  if (!sourceLine) {
    return [];
  }

  return sourceLine
    .slice("联网来源：".length)
    .split("；")
    .map(
      (item) =>
        item.split("｜")[0]?.trim(),
    )
    .filter(
      (item): item is string =>
        Boolean(item),
    );
}

function companyResearchAnswer(
  question: string,
  input: JobInput,
  analysis: JobAnalysisOutput,
): InterviewAnswerDraft {
  const company =
    input.companyName?.trim() ||
    "目标公司";

  const description =
    input.companyDescription
      ?.trim() ||
    "岗位资料显示公司业务与户外运动用品相关";

  const sources =
    tavilySourceNames(analysis);

  const sourceText =
    sources.length > 0
      ? sources
          .slice(0, 3)
          .join("、")
      : "当前岗位资料";

  return createAnswer(
    question,

    `我对${company}的理解分为公开事实、用户特征和岗位关联三层。第一，岗位资料中的公司说明为：${description.replace(/[。；;，,\s]+$/g, "")}。当前Tavily还检索到${sourceText}等招聘或公开页面，仅用于补充招聘主体和岗位线索；产品信息与工商信息仍需以公司官网和官方公示系统为准。第二，从户外用品场景推断，用户需求可能受到出行场景、季节、品类组合、产品使用周期和内容种草影响，因此复购不一定只是重复购买同一商品，也可能来自配件补充、品类扩展、装备升级和新的户外场景。这里属于我的岗位分析假设，不是公司内部数据。第三，结合CRM岗位，我理解工作的重点是识别不同生命周期和兴趣场景的用户，通过会员权益、内容触达、活动和数据复盘，提高用户活跃、复购和长期价值。入职前我还会继续核实公司的会员规模、主要渠道、核心品类、复购周期和当前CRM系统。`,

    [
      `Tavily公开来源：${sourceText}`,
      "岗位提供的公司介绍与JD",
      "公开资料与个人推断明确分开",
    ],

    [
      "你认为挪客最值得优先运营的是哪类用户？",
      "你还会从哪些渠道了解公司？",
    ],

    [
      "搜索摘要不得包装为官方工商定论。",
      "户外用户特征必须说明属于岗位分析假设。",
    ],
  );
}

function dataOptimizationAnswer(
  question: string,
): InterviewAnswerDraft {
  return createAnswer(
    question,

    "我需要先说明，我没有独立负责商业运营策略并获得销售增长结果的正式经历。最接近的一次实践发生在客服与工单分析中。团队每周会整理查询单，我使用Excel数据透视观察问题类型和重复出现情况，再结合员工咨询内容判断哪些问题适合通过统一说明或宣传降低沟通成本。对于部分高频咨询，团队在内部社交平台、公众号和社群增加信息展示后，我观察到其中一些问题在后续一周不再重复出现。我的个人贡献是完成数据整理、问题分类、内容归纳和变化观察；由于缺少完整底表，我不会使用65%到32%的精确结果。这个案例让我形成了一个方法：先统一数据口径，再定位高频问题，提出可执行动作，最后观察调整后是否真的减少重复问题。",

    [
      "每周查询单数据透视",
      "用户咨询问题分类",
      "宣传后部分问题重复出现减少",
    ],

    [
      "你如何定义高频问题？",
      "没有完整底表时如何验证结论？",
    ],

    [
      "不得使用65%到32%的精确KPI。",
      "不得包装为本人独立决定并落地整体运营策略。",
    ],
  );
}

function repurchaseAnswer(
  question: string,
): InterviewAnswerDraft {
  return createAnswer(
    question,

    "如果会员复购率下降，我不会直接发优惠券，而会先确认口径，再定位下降发生在哪里。第一步确认复购率的定义、观察周期和对照周期，并排除季节、活动和数据异常。第二步按首购时间、渠道、品类、会员等级、客单价和生命周期进行用户分层，判断是整体下降还是特定人群下降。第三步查看从触达、打开、点击、加购到购买的漏斗，并结合退换货、客服反馈和问卷寻找原因。第四步形成可验证假设，例如产品使用周期较长、内容相关性下降、权益吸引力不足、触达频率过高、库存或购买流程存在阻塞。第五步选择小范围人群进行对照测试，每次只调整少量变量，观察复购率、转化率、退订率、投诉率和单位成本。因为我没有该公司的真实交易数据，这是一套诊断方法，不能包装成已经取得的业务成果。",

    [
      "Excel与数据透视基础",
      "工单和用户问题分类经验",
      "问卷与用户反馈处理经验",
    ],

    [
      "你会优先测试哪一个变量？",
      "户外用品购买周期长时如何提高复购？",
    ],

    [
      "不得把工单审核包装成复购项目成果。",
      "不得虚构实际复购提升比例。",
    ],
  );
}

function rfmAnswer(
  question: string,
): InterviewAnswerDraft {
  return createAnswer(
    question,

    "RFM是一种基础用户分层方法。R代表最近一次购买时间，F代表一定周期内的购买频次，M代表一定周期内的消费金额。实际使用时，我会先统一时间窗口和订单口径，再分别对三个指标进行分组或评分，识别高价值活跃用户、潜力用户、需要维护的用户和沉默流失风险用户。不同人群不能使用同一套触达方式，例如高价值用户更适合专属服务和新品优先体验，潜力用户可以通过品类推荐促进第二次购买，沉默用户则需要先判断流失原因，再设计召回内容。复盘时除了观察复购和销售结果，还要关注退订、投诉、优惠成本和触达频率。需要说明的是，我目前没有使用企业真实交易数据完成过正式RFM项目，这是一套可用Excel模拟验证的方法。",

    [
      "Excel与数据透视基础",
      "用户问题分类能力",
      "待完成的模拟用户分层练习",
    ],

    [
      "RFM各指标如何划分区间？",
      "高消费但很久没有购买的用户如何运营？",
    ],

    [
      "不得声称已经完成企业正式RFM项目。",
      "不得虚构公司用户数据。",
    ],
  );
}

function ltvAnswer(
  question: string,
): InterviewAnswerDraft {
  return createAnswer(
    question,

    "我理解LTV是一个用户在与企业保持关系的整个周期内能够贡献的综合价值，而不只是某一次订单金额。实际分析时，我会先统一用户、订单、退款和观察周期的口径，再从获客质量、首购转化、购买频次、客单价、留存周期和服务成本几个方面拆解。提升LTV也不能只依靠优惠券：可以改善新用户首次体验，按照生命周期和兴趣场景进行内容触达，通过配件补充、品类扩展和装备升级创造合理的复购场景，同时减少过度营销造成的退订和投诉。对于户外用品岗位，我会把季节、出行场景、产品使用周期和品类关联作为待验证假设。需要说明的是，我没有使用企业真实交易数据完成过正式LTV项目，因此这是一套分析框架，不能包装成已经取得的业务成果。",

    [
      "Excel与数据透视基础",
      "用户反馈和问题分类经验",
      "活动触达与问卷回收实践",
    ],

    [
      "LTV和复购率有什么区别？",
      "户外用品购买频次较低时如何提高LTV？",
    ],

    [
      "不得声称已经完成企业正式LTV项目。",
      "不得虚构用户收入、成本和留存数据。",
      "户外用户特征必须说明属于待验证假设。",
    ],
  );
}
function aiEfficiencyAnswer(
  question: string,
): InterviewAnswerDraft {
  return createAnswer(
    question,

    "我目前最完整的AI效率案例是Willow Job Agent求职助手项目。我的问题不是缺少大模型回答，而是岗位判断、简历修改和面试准备经常重复消耗时间，而且AI容易虚构数据。为解决这个问题，我先整理个人证据库和禁止表述，再定义岗位硬过滤、评分、简历动作、面试答案和短期补齐任务等输出契约。在AI辅助下，我接入Kimi和DeepSeek主备模型、Tavily公开网页检索、本地规则引擎和网页界面，并持续用真实岗位检查错误。我的个人贡献主要是需求定义、证据边界、Prompt设计、规则设计、测试样本和结果验收；代码实现由AI辅助完成。项目目前已完成本地岗位规则8项评测全部通过、网页执行包7项烟雾测试全部通过。这个项目提升效率的关键不是让AI直接替我决定，而是把重复判断结构化，并保留人工复核、来源核验和最终投递确认。",

    [
      "Willow Job Agent 0到1项目",
      "本地规则评测8/8通过",
      "网页与执行包烟雾测试7/7通过",
    ],

    [
      "你在项目中的个人贡献是什么？",
      "如何防止AI虚构简历数据？",
    ],

    [
      "必须说明代码实现由AI辅助完成。",
      "不得声称独立编程开发完整系统。",
      "不得虚构没有日志支持的效率提升百分比。",
    ],
  );
}

function roleUnderstandingAnswer(
  question: string,
  input: JobInput,
  analysis: JobAnalysisOutput,
): InterviewAnswerDraft {
  const role =
    input.jobTitle?.trim() ||
    analysis.actualRole;

  const roleText = [
    role,
    analysis.actualRole,
    input.jobDescription,
  ]
    .join("\n")
    .toLowerCase();

  if (
    /crm|会员|复购|生命周期|用户分层|积分/.test(
      roleText,
    )
  ) {
    return createAnswer(
      question,

      `我理解${role}的核心目标不是单纯发优惠券或执行活动，而是通过用户分层、会员机制、持续触达和数据复盘，把一次购买或一次接触转化为可以长期经营的用户关系。具体可以分为四层：第一，统一用户、订单、会员和触达数据口径，按照生命周期、品类兴趣、活跃程度和价值进行分层；第二，为不同人群设计邮件内容、积分权益、推荐奖励和会员活动，而不是对所有人使用同一种运营动作；第三，观察送达、打开、点击、参与、转化、复购和生命周期价值，同时关注退订、投诉和活动成本；第四，根据结果持续调整用户分层、内容、权益和触达频率。我目前没有正式独立负责CRM业务指标的经历，但活动触达、问卷回收、工单审核和客诉跟进让我具备用户沟通、问题分类和数据整理基础。`,

      [
        "岗位JD中的会员、用户分层、复购与生命周期价值职责",
        "活动触达800+与80份问卷实践",
        "2000+条工单审核与问题分类实践",
      ],

      [
        "你认为该岗位最重要的三个指标是什么？",
        "不同生命周期用户应该如何运营？",
      ],

      [
        "不得把分析框架包装成正式CRM项目成果。",
        "不得虚构复购率、LTV或销售增长数据。",
      ],
    );
  }

  if (
    /aigc|内容生成|音视频|多模态|内容生产/.test(
      roleText,
    )
  ) {
    return createAnswer(
      question,

      `我理解${role}的核心目标，是把业务或创意需求稳定转化为符合质量标准、能够按时交付并支持持续迭代的内容资产。工作不只包括生成内容，还包括需求拆解、素材与提示词管理、质量检查、版本记录、发布协作和效果复盘。对于AIGC内容，还需要重点检查提示词匹配、人物与画面一致性、构图、光影、运动连续性、画面崩坏和音画一致性，并通过人工复核避免错误内容直接发布。发布后再结合播放、完播、互动和用户反馈判断内容是否需要调整。我可以使用AIGC图片与视频生成、音视频评测和影视视听语言基础支持这些工作，但不会把个人练习包装成正式商业项目。`,

      [
        "AIGC图片与视频生成实践",
        "AIGC音视频质量评测样本",
        "影视摄影与制作专业背景",
      ],

      [
        "如何保证批量内容的一致性？",
        "生成内容质量不稳定时如何迭代？",
      ],

      [
        "个人作品不得包装成正式任职成果。",
        "未验证的生成工具不得描述为熟练使用。",
      ],
    );
  }

  if (
    /ai产品|产品运营|产品经理|prd|用户需求/.test(
      roleText,
    )
  ) {
    return createAnswer(
      question,

      `我理解${role}的核心目标，是识别真实用户问题，推动用户理解和使用产品，再把使用数据与反馈转化为可以执行的产品优化。工作需要连接用户、产品和业务：先明确目标用户与使用场景，再通过访谈、反馈、行为数据和运营活动发现阻塞点，随后形成需求优先级、运营方案和验收指标，并持续观察激活、使用、留存和满意度变化。我完成过AI产品研究、BRD与PRD练习，也在AI辅助下搭建了本地求职Agent，可以证明需求拆解、流程设计和测试迭代能力；但我不会把课程作业或个人项目包装成正式上线产品成果。`,

      [
        "腾讯AI陪伴产品25页研究报告",
        "自由笔记BRD与PRD",
        "AI辅助搭建Willow Job Agent",
      ],

      [
        "你如何判断一个需求是否值得做？",
        "产品运营与普通活动运营有什么区别？",
      ],

      [
        "课程作业不得包装成正式商业项目。",
        "必须说明Agent代码实现由AI辅助完成。",
      ],
    );
  }

  return createAnswer(
    question,

    `我理解${role}的核心目标，是围绕明确的业务和用户问题完成执行、协作与复盘，而不是只完成孤立任务。首先明确服务对象、目标和验收标准；其次把目标拆成用户触达、内容或活动执行、数据记录和跨部门协作；最后根据用户反馈和运营数据判断结果，并形成下一轮行动。我的活动执行、问卷回收、工单审核和客诉推进经历能够支持用户沟通、信息整理和问题跟进，但具体业务指标仍需要结合公司的真实口径进一步确认。`,

    [
      "活动执行与用户触达实践",
      "问卷、工单和用户反馈整理",
      "跨部门问题推进经历",
    ],

    [
      "你会如何确定工作优先级？",
      "如何判断一次运营动作是否有效？",
    ],

    [
      "不得虚构未提供的业务指标。",
      "不得把团队结果描述为个人独立完成。",
    ],
  );
}

export function buildHighPriorityInterviewAnswer(
  question: string,
  input: JobInput,
  analysis: JobAnalysisOutput,
): InterviewAnswerDraft | null {
  const aigcAnswer =
    buildAigcInterviewAnswer(
      question,
      input,
      analysis,
    );

  if (aigcAnswer) {
    return aigcAnswer;
  }

  const intent =
    classifyInterviewIntent(
      question,
    );

  if (
    intent === "COMPANY_RESEARCH"
  ) {
    return companyResearchAnswer(
      question,
      input,
      analysis,
    );
  }

  if (
    intent === "DATA_ANALYSIS" &&
    /优化运营策略|通过数据分析/.test(
      question,
    )
  ) {
    return dataOptimizationAnswer(
      question,
    );
  }

  if (
    intent ===
    "REPURCHASE_DIAGNOSIS"
  ) {
    return repurchaseAnswer(
      question,
    );
  }

  if (intent === "RFM") {
    return rfmAnswer(question);
  }

  if (intent === "LTV") {
    return ltvAnswer(question);
  }

  if (
    intent === "AI_EFFICIENCY"
  ) {
    return aiEfficiencyAnswer(
      question,
    );
  }

  if (
    intent === "ROLE_UNDERSTANDING"
  ) {
    return roleUnderstandingAnswer(
      question,
      input,
      analysis,
    );
  }

  return null;
}
