const form = document.querySelector("#job-form");
const analyzeButton = document.querySelector(
  "#analyze-button",
);
const formMessage = document.querySelector(
  "#form-message",
);
const resultsSection = document.querySelector(
  "#results",
);

let latestResult = null;

const decisionLabels = {
  APPLY: "直接投递",
  APPLY_AFTER_EDIT: "修改后投递",
  VERIFY_FIRST: "核实后决定",
  REJECT: "不投递",
};

const resumeLabels = {
  NO_EDIT: "无需修改",
  LIGHT_EDIT: "轻量修改",
  TARGETED_EDIT: "定向修改",
  NEW_VERSION: "新建简历版本",
  DO_NOT_SUBMIT: "不要投递",
};

function text(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function listHtml(
  items,
  emptyText = "暂无",
) {
  if (!items || items.length === 0) {
    return `
      <p class="empty">
        ${escapeHtml(emptyText)}
      </p>
    `;
  }

  const listItems = items
    .map(
      (item) =>
        `<li>${escapeHtml(item)}</li>`,
    )
    .join("");

  return `<ul>${listItems}</ul>`;
}

function getFormPayload() {
  const data = new FormData(form);
  const payload = {};

  for (const [key, rawValue] of data.entries()) {
    const value = String(rawValue).trim();

    if (value) {
      payload[key] = value;
    }
  }

  return payload;
}

function setLoading(isLoading) {
  analyzeButton.disabled = isLoading;

  analyzeButton.textContent = isLoading
    ? "正在分析…"
    : "开始分析";

  if (isLoading) {
    formMessage.classList.remove("error");
    formMessage.textContent =
      "请稍候，不要关闭页面。";
  }
}

function renderApplySection(result) {
  document.querySelector(
    "#apply-decision",
  ).textContent =
    decisionLabels[result.decision] ??
    result.decision;

  const hardReasons =
    result.hardFilter?.reasons ?? [];

  const missingInformation =
    result.missingInformation ?? [];

  const parts = [
    `
      <p>
        <strong>真实岗位：</strong>
        ${escapeHtml(result.actualRole)}
      </p>
    `,
    `
      <p>
        <strong>硬过滤：</strong>
        ${escapeHtml(
          result.hardFilter?.status,
        )}
      </p>
    `,
  ];

  if (hardReasons.length > 0) {
    parts.push(
      "<h4>淘汰原因</h4>",
      listHtml(hardReasons),
    );
  }

  if (missingInformation.length > 0) {
    parts.push(
      "<h4>投递前或沟通时核实</h4>",
      listHtml(missingInformation),
    );
  }

  document.querySelector(
    "#apply-details",
  ).innerHTML = parts.join("");
}

function renderResumeSection(result) {
  document.querySelector(
    "#resume-action",
  ).textContent =
    resumeLabels[result.resumeAction] ??
    result.resumeAction;

  const resumeEdits = (
    result.resumeEdits ?? []
  ).map(
    (item) =>
      `${item.section}：${item.instruction}`,
  );

  document.querySelector(
    "#resume-details",
  ).innerHTML = `
    <p>
      <strong>基础版本：</strong>
      ${escapeHtml(result.resumeBaseVersion)}
    </p>

    ${listHtml(
      resumeEdits,
      "这个岗位不需要修改简历。",
    )}
  `;
}

function renderInterviewSection(result) {
  const preparation =
    result.interviewPreparation ?? {};

  const questions = (
    preparation.likelyQuestions ?? []
  ).map(
    (question, index) =>
      `${index + 1}. ${question}`,
  );

  const answerPoints =
    preparation.answerPoints ?? [];

  const claimsToAvoid =
    preparation.claimsToAvoid ?? [];

  const employerQuestions =
    preparation.questionsToAskEmployer ?? [];

  document.querySelector(
    "#interview-details",
  ).innerHTML = [
    listHtml(
      questions,
      "这个岗位不需要准备面试。",
    ),

    answerPoints.length
      ? `
          <h4>回答重点</h4>
          ${listHtml(answerPoints)}
        `
      : "",

    claimsToAvoid.length
      ? `
          <h4>不要使用的表述</h4>
          ${listHtml(claimsToAvoid)}
        `
      : "",

    employerQuestions.length
      ? `
          <h4>反问用人方</h4>
          ${listHtml(employerQuestions)}
        `
      : "",
  ].join("");
}

function renderSkillSection(result) {
  const skillItems = (
    result.shortTermSkillPlan ?? []
  ).map(
    (item) =>
      `${item.priority}｜${item.skill}｜` +
      `${item.estimatedHours} 小时｜` +
      `${item.verifiableDeliverable}`,
  );

  document.querySelector(
    "#skill-details",
  ).innerHTML = listHtml(
    skillItems,
    "暂无需要临时补齐的技能。",
  );
}

function renderEvidenceSection(result) {
  const evidenceItems = (
    result.evidenceUsed ?? []
  ).map(
    (item) =>
      `${item.level}级｜${item.claim}`,
  );

  document.querySelector(
    "#evidence-list",
  ).innerHTML = listHtml(
    evidenceItems,
    "没有使用未经核验的个人证据。",
  );
}

function renderRiskSection(result) {
  const riskItems = [
    ...(result.riskFlags ?? []).map(
      (item) =>
        `${item.severity}｜${item.finding}`,
    ),

    ...(result.missingInformation ?? []).map(
      (item) =>
        `待核实｜${item}`,
    ),

    ...(result.evidenceConflicts ?? []).map(
      (item) =>
        `证据边界｜${item}`,
    ),

    ...(result.scoreDeductions ?? []).map(
      (item) =>
        `评分扣减｜${item}`,
    ),

    ...(result.limitations ?? []).map(
      (item) =>
        `运行说明｜${item}`,
    ),
  ];

  document.querySelector(
    "#risk-list",
  ).innerHTML = listHtml(
    riskItems,
    "没有发现明确风险。",
  );
}

function renderNextActions(result) {
  const nextActions = (
    result.nextActions ?? []
  ).map((item) => {
    const deadline = item.deadline
      ? `｜${item.deadline}`
      : "";

    return (
      `${item.priority}｜${item.action}` +
      deadline
    );
  });

  document.querySelector(
    "#next-action-list",
  ).innerHTML = listHtml(
    nextActions,
    "暂无下一步行动。",
  );
}

function renderResult(result) {
  latestResult = result;

  resultsSection.classList.remove("hidden");

  const badge = document.querySelector(
    "#decision-badge",
  );

  badge.textContent =
    decisionLabels[result.decision] ??
    result.decision;

  badge.className =
    "decision-badge " +
    `decision-${result.decision.toLowerCase()}`;

  document.querySelector(
    "#decision-title",
  ).textContent = result.actualRole;

  document.querySelector(
    "#decision-summary",
  ).textContent = result.decisionSummary;

  document.querySelector(
    "#score-value",
  ).textContent = result.rankingScore;

  document.querySelector(
    "#grade-value",
  ).textContent = `${result.grade} 档`;

  document.querySelector(
    "#recruiter-message",
  ).textContent =
    result.recruiterMessage ||
    "该岗位已经淘汰，不发送消息。";

  renderApplySection(result);
  renderResumeSection(result);
  renderInterviewSection(result);
  renderSkillSection(result);
  renderEvidenceSection(result);
  renderRiskSection(result);
  renderNextActions(result);

  resultsSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

async function analyzeJob(event) {
  event.preventDefault();

  setLoading(true);

  const requestPayload = getFormPayload();

  try {
    const response = await fetch(
      "/api/analyze",
      {
        method: "POST",

        headers: {
          "content-type": "application/json",
        },

        body: JSON.stringify(requestPayload),
      },
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload.error ||
          "分析失败，请检查输入。",
      );
    }

    renderResult(payload.result);
    window.renderWillowActionPack?.(
      payload.applicationPack,
    );

    window.dispatchEvent(
      new CustomEvent(
        "willow:analysis-ready",
        {
          detail: {
            input: requestPayload,
            result: payload.result,
          },
        },
      ),
    );

    formMessage.classList.remove("error");

    formMessage.textContent =
      "分析完成，结果已经自动保存。";
  } catch (error) {
    formMessage.classList.add("error");

    formMessage.textContent =
      error instanceof Error
        ? error.message
        : String(error);
  } finally {
    setLoading(false);
  }
}

async function checkHealth() {
  const serviceStatus =
    document.querySelector(
      "#service-status",
    );

  const providerStatus =
    document.querySelector(
      "#provider-status",
    );

  try {
    const response = await fetch(
      "/health",
    );

    if (!response.ok) {
      throw new Error(
        "健康检查返回失败",
      );
    }

    const payload = await response.json();

    serviceStatus.textContent =
      "本地服务已连接";

    providerStatus.textContent =
      `${payload.provider.toUpperCase()} 模式 · ` +
      `v${payload.version}`;
  } catch {
    serviceStatus.textContent =
      "本地服务连接失败";

    providerStatus.textContent =
      "请确认终端中的服务仍在运行";

    document.body.classList.add(
      "offline",
    );
  }
}

async function copyRecruiterMessage() {
  if (!latestResult?.recruiterMessage) {
    return;
  }

  const copyButton =
    document.querySelector(
      "#copy-message",
    );

  try {
    await navigator.clipboard.writeText(
      latestResult.recruiterMessage,
    );

    copyButton.textContent = "已复制";
  } catch {
    const temporaryArea =
      document.createElement("textarea");

    temporaryArea.value =
      latestResult.recruiterMessage;

    document.body.appendChild(
      temporaryArea,
    );

    temporaryArea.select();

    document.execCommand("copy");

    temporaryArea.remove();

    copyButton.textContent = "已复制";
  }

  setTimeout(() => {
    copyButton.textContent = "复制";
  }, 1500);
}

function downloadLatestJson() {
  if (!latestResult) {
    return;
  }

  const contents =
    `${JSON.stringify(
      latestResult,
      null,
      2,
    )}\n`;

  const blob = new Blob(
    [contents],
    {
      type: "application/json",
    },
  );

  const objectUrl =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = objectUrl;

  link.download =
    `willow-${latestResult.grade}-` +
    `${latestResult.decision}.json`;

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}

function fillSample() {
  const sample = {
    jobTitle:
      "AIGC 内容运营（2026届校招）",

    companyName:
      "示例科技公司",

    sourcePlatform:
      "公司官网",

    city:
      "杭州",

    salaryText:
      "8K–12K·13薪",

    workLocation:
      "杭州市",

    jobDescription:
      "负责 AIGC 图片与视频内容生产、" +
      "提示词迭代、音视频质量评测、" +
      "内容数据复盘与跨部门协作。" +
      "要求本科及以上，接受应届生；" +
      "熟悉 Midjourney、Premiere、" +
      "After Effects 或 Photoshop；" +
      "入职签订正式劳动合同并提供五险一金；" +
      "不涉及销售、陌生开发、续费指标或直播出镜。",
  };

  for (
    const [name, value]
    of Object.entries(sample)
  ) {
    const field =
      form.elements.namedItem(name);

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement
    ) {
      field.value = value;
    }
  }
}

function clearForm() {
  form.reset();

  resultsSection.classList.add(
    "hidden",
  );

  latestResult = null;

  window.dispatchEvent(
    new CustomEvent("willow:analysis-cleared"),
  );

  formMessage.textContent = "";

  formMessage.classList.remove(
    "error",
  );
}

document.querySelector(
  "#load-sample",
).addEventListener(
  "click",
  fillSample,
);

document.querySelector(
  "#clear-button",
).addEventListener(
  "click",
  clearForm,
);

document.querySelector(
  "#copy-message",
).addEventListener(
  "click",
  copyRecruiterMessage,
);

document.querySelector(
  "#download-json",
).addEventListener(
  "click",
  downloadLatestJson,
);

form.addEventListener(
  "submit",
  analyzeJob,
);

checkHealth();

(() => {
  const fieldGrid =
    form.querySelector(".field-grid");

  const sourceLabel =
    document.createElement("label");

  sourceLabel.innerHTML = `
    <span>BOSS 岗位链接</span>
    <input
      id="source-url"
      type="url"
      placeholder="粘贴当前 BOSS 岗位网页链接"
    />
  `;

  fieldGrid.appendChild(sourceLabel);

  const recruiterCard =
    document
      .querySelector("#recruiter-message")
      .closest("article");

  const desk =
    document.createElement("article");

  desk.className =
    "result-card accent-blue wide-card willow-confirmation-desk";

  desk.innerHTML = `
    <div class="card-title-row">
      <div>
        <p>6 · 投递确认台</p>
        <h3>最后一步由你手动完成</h3>
      </div>

      <span id="manual-status">
        等待确认
      </span>
    </div>

    <p class="manual-note">
      Willow 不会自动登录、选择简历或点击发送。
      完成下列检查后，只会复制话术并打开原 BOSS 岗位页。
    </p>

    <div class="manual-checks">
      <label>
        <input
          id="confirm-decision"
          type="checkbox"
        />
        我已确认 Agent 的结论不是“不投递”
      </label>

      <label>
        <input
          id="confirm-resume"
          type="checkbox"
        />
        我会在 BOSS 中亲自核对并选择正确简历
      </label>

      <label>
        <input
          id="confirm-message"
          type="checkbox"
        />
        我已阅读话术，确认不存在虚假或错误表述
      </label>
    </div>

    <div class="manual-actions">
      <button
        id="verify-company"
        class="button secondary"
        type="button"
      >
        核验公司工商信息
      </button>

      <button
        id="open-boss-job"
        class="button primary"
        type="button"
        disabled
      >
        复制话术并打开 BOSS 岗位页
      </button>
    </div>

    <p
      id="manual-message"
      class="manual-message"
      role="status"
    ></p>
  `;

  recruiterCard.insertAdjacentElement(
    "afterend",
    desk,
  );

  const style =
    document.createElement("style");

  style.textContent = `
    .willow-confirmation-desk {
      border-color: rgba(57, 114, 196, 0.32);
    }

    .manual-note {
      color: var(--muted);
      line-height: 1.75;
    }

    .manual-checks {
      display: grid;
      gap: 0.8rem;
      margin: 1.2rem 0;
    }

    .manual-checks label {
      display: flex;
      gap: 0.7rem;
      align-items: flex-start;
      line-height: 1.55;
    }

    .manual-checks input {
      width: 1.05rem;
      height: 1.05rem;
      margin-top: 0.18rem;
    }

    .manual-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
    }

    #manual-status {
      padding: 0.45rem 0.75rem;
      color: var(--green-dark);
      background: rgba(31, 111, 89, 0.1);
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .manual-message {
      min-height: 1.5rem;
      margin: 0.9rem 0 0;
      color: var(--muted);
      line-height: 1.6;
    }

    #open-boss-job:disabled {
      cursor: not-allowed;
      opacity: 0.48;
    }
  `;

  document.head.appendChild(style);

  const sourceInput =
    document.querySelector("#source-url");

  const openButton =
    document.querySelector("#open-boss-job");

  const status =
    document.querySelector("#manual-status");

  const manualMessage =
    document.querySelector("#manual-message");

  const confirmationSelectors = [
    "#confirm-decision",
    "#confirm-resume",
    "#confirm-message",
  ];

  function parseBossUrl() {
    try {
      const url =
        new URL(sourceInput.value.trim());

      const validProtocol =
        url.protocol === "https:" ||
        url.protocol === "http:";

      const validHost =
        url.hostname === "zhipin.com" ||
        url.hostname.endsWith(
          ".zhipin.com",
        );

      if (!validProtocol || !validHost) {
        return null;
      }

      return url;
    } catch {
      return null;
    }
  }

  function allConfirmed() {
    return confirmationSelectors.every(
      (selector) =>
        document.querySelector(selector)
          .checked,
    );
  }

  function updateDesk() {
    if (!latestResult) {
      openButton.disabled = true;
      status.textContent = "等待分析";
      return;
    }

    if (latestResult.decision === "REJECT") {
      openButton.disabled = true;
      status.textContent = "岗位已淘汰";
      return;
    }

    if (!parseBossUrl()) {
      openButton.disabled = true;
      status.textContent = "缺少 BOSS 链接";
      return;
    }

    if (!allConfirmed()) {
      openButton.disabled = true;
      status.textContent = "等待确认";
      return;
    }

    openButton.disabled = false;
    status.textContent = "可以打开";
  }

  async function copyTextSafely(value) {
    try {
      await navigator.clipboard.writeText(
        value,
      );
    } catch {
      const temporaryArea =
        document.createElement("textarea");

      temporaryArea.value = value;

      document.body.appendChild(
        temporaryArea,
      );

      temporaryArea.select();

      document.execCommand("copy");

      temporaryArea.remove();
    }
  }

  document
    .querySelector("#verify-company")
    .addEventListener(
      "click",
      () => {
        const companyField =
          form.elements.namedItem(
            "companyName",
          );

        const companyName =
          companyField?.value?.trim() ?? "";

        window.open(
          "https://www.gsxt.gov.cn/index.html",
          "_blank",
          "noopener,noreferrer",
        );

        if (companyName) {
          copyTextSafely(companyName);

          manualMessage.textContent =
            `已复制公司名称“${companyName}”。` +
            "请在公示系统中粘贴搜索，人工完成验证码，" +
            "并核对企业全称、经营状态和注册地址。";
        } else {
          manualMessage.textContent =
            "尚未填写公司名称，请在公示系统中手动输入企业全称。";
        }
      },
    );

  openButton.addEventListener(
    "click",
    () => {
      const url = parseBossUrl();

      if (
        !url ||
        !latestResult ||
        latestResult.decision === "REJECT" ||
        !allConfirmed()
      ) {
        updateDesk();
        return;
      }

      window.open(
        url.href,
        "_blank",
        "noopener,noreferrer",
      );

      copyTextSafely(
        latestResult.recruiterMessage ?? "",
      );

      manualMessage.textContent =
        "话术已复制。请在 BOSS 新页面亲自核对公司、岗位、" +
        "简历版本和消息内容，再点击最终发送。";
    },
  );

  for (
    const selector
    of confirmationSelectors
  ) {
    document
      .querySelector(selector)
      .addEventListener(
        "change",
        updateDesk,
      );
  }

  sourceInput.addEventListener(
    "input",
    updateDesk,
  );

  form.addEventListener(
    "submit",
    () => {
      for (
        const selector
        of confirmationSelectors
      ) {
        document.querySelector(
          selector,
        ).checked = false;
      }

      manualMessage.textContent = "";
      updateDesk();
    },
  );

  document
    .querySelector("#clear-button")
    .addEventListener(
      "click",
      () => {
        manualMessage.textContent = "";
        updateDesk();
      },
    );

  new MutationObserver(
    updateDesk,
  ).observe(
    resultsSection,
    {
      attributes: true,
      attributeFilter: ["class"],
    },
  );
})();
