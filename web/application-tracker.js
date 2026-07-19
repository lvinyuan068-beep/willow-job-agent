(() => {
  const statusLabels = {
    APPLIED: "已投递",
    HR_VIEWED: "HR已读",
    VALID_REPLY: "有效沟通",
    SCREENING_PASSED: "通过初筛",
    TEST: "笔试",
    INTERVIEW: "面试",
    NEXT_ROUND: "进入下一轮",
    OFFER: "Offer",
    REJECTED: "拒绝",
    WITHDRAWN: "主动终止",
  };

  let currentContext = null;
  let currentRecordId = null;
  let snapshot = null;
  let busy = false;

  const resultsSection =
    document.querySelector("#results");

  const auditPanel =
    resultsSection.querySelector(
      ".audit-panel",
    );

  const panel =
    document.createElement("section");

  panel.id =
    "application-tracker-panel";

  panel.className =
    "panel application-tracker-panel";

  panel.innerHTML = `
    <div class="section-heading compact">
      <div>
        <p class="section-number">
          04 / 投递反馈闭环
        </p>

        <h2>
          用真实结果校准求职策略
        </h2>

        <p class="tracker-lead">
          只有你确认已经完成投递后，岗位才会进入统计。
          岗位分析本身不会被当作真实投递。
        </p>
      </div>

      <button
        id="tracker-refresh"
        class="button secondary"
        type="button"
      >
        刷新数据
      </button>
    </div>

    <div class="tracker-metrics">
      <div class="tracker-metric">
        <span id="metric-applications">0</span>
        <small>合格投递</small>
      </div>

      <div class="tracker-metric">
        <span id="metric-reply-rate">—</span>
        <small>有效反馈率</small>
      </div>

      <div class="tracker-metric">
        <span id="metric-interview-rate">—</span>
        <small>面试邀请率</small>
      </div>

      <div class="tracker-metric">
        <span id="metric-next-rate">—</span>
        <small>下一轮转化率</small>
      </div>

      <div class="tracker-metric">
        <span id="metric-offers">0</span>
        <small>Offer</small>
      </div>
    </div>

    <div
      id="tracker-sample-note"
      class="tracker-sample-note"
    ></div>

    <div class="tracker-layout">
      <article class="tracker-card">
        <div class="tracker-card-heading">
          <div>
            <p>当前岗位</p>
            <h3>确认实际投递</h3>
          </div>

          <span
            id="tracker-current-badge"
            class="tracker-badge"
          >
            等待岗位分析
          </span>
        </div>

        <div
          id="tracker-current-job"
          class="tracker-current-job"
        >
          请先在上方完成一个岗位分析。
        </div>

        <div class="tracker-field-grid">
          <label>
            <span>简历是否做了定向修改</span>

            <select id="tracker-customized">
              <option value="true">
                是，使用定向版本
              </option>

              <option value="false">
                否，使用通用版本
              </option>
            </select>
          </label>

          <label>
            <span>本次投入时间（分钟）</span>

            <input
              id="tracker-time-cost"
              type="number"
              min="0"
              max="1440"
              value="0"
            />
          </label>
        </div>

        <label class="tracker-full-field">
          <span>投递备注（可选）</span>

          <textarea
            id="tracker-create-notes"
            rows="3"
            placeholder="例如：通过BOSS投递，使用CRM定向简历。"
          ></textarea>
        </label>

        <button
          id="tracker-record-application"
          class="button primary"
          type="button"
          disabled
        >
          确认已经实际投递
        </button>

        <p
          id="tracker-create-message"
          class="tracker-message"
          role="status"
        ></p>
      </article>

      <article
        id="tracker-update-card"
        class="tracker-card hidden"
      >
        <div class="tracker-card-heading">
          <div>
            <p>结果更新</p>
            <h3>记录招聘进度</h3>
          </div>

          <span
            id="tracker-selected-status"
            class="tracker-badge"
          ></span>
        </div>

        <div
          id="tracker-selected-job"
          class="tracker-current-job"
        ></div>

        <div class="tracker-field-grid">
          <label>
            <span>当前阶段</span>

            <select id="tracker-status">
              ${Object.entries(
                statusLabels,
              )
                .map(
                  ([value, label]) =>
                    `<option value="${value}">${label}</option>`,
                )
                .join("")}
            </select>
          </label>

          <label>
            <span>下次跟进日期（可选）</span>

            <input
              id="tracker-follow-up"
              type="date"
            />
          </label>
        </div>

        <label
          id="tracker-rejection-field"
          class="tracker-full-field hidden"
        >
          <span>
            拒绝原因
            <b>必填</b>
          </span>

          <input
            id="tracker-rejection-reason"
            placeholder="若HR未说明，填写：未收到明确原因"
          />
        </label>

        <label class="tracker-full-field">
          <span>进展备注（可选）</span>

          <textarea
            id="tracker-update-notes"
            rows="3"
            placeholder="例如：收到线上面试邀请，时间为7月22日。"
          ></textarea>
        </label>

        <button
          id="tracker-save-update"
          class="button primary"
          type="button"
        >
          保存进展
        </button>

        <p
          id="tracker-update-message"
          class="tracker-message"
          role="status"
        ></p>
      </article>
    </div>

    <details class="tracker-history">
      <summary>
        <span>历史投递记录</span>

        <span
          id="tracker-history-count"
          class="tracker-history-count"
        >
          0 条
        </span>
      </summary>

      <div
        id="tracker-records"
        class="tracker-records"
      ></div>
    </details>

    <div class="tracker-comparison">
      <div>
        <h3>定向简历</h3>
        <p id="tracker-customized-result">
          暂无样本
        </p>
      </div>

      <div>
        <h3>通用简历</h3>
        <p id="tracker-standard-result">
          暂无样本
        </p>
      </div>

      <div>
        <h3>拒绝原因 Top 3</h3>
        <div id="tracker-rejection-top">
          暂无数据
        </div>
      </div>
    </div>
  `;

  auditPanel.insertAdjacentElement(
    "beforebegin",
    panel,
  );

  const style =
    document.createElement("style");

  style.textContent = `
    .application-tracker-panel {
      margin-top: 1.5rem;
    }

    .tracker-lead {
      max-width: 48rem;
      margin: 0.45rem 0 0;
      color: var(--muted);
      line-height: 1.7;
    }

    .tracker-metrics {
      display: grid;
      grid-template-columns:
        repeat(5, minmax(0, 1fr));
      gap: 0.8rem;
      margin-top: 1.25rem;
    }

    .tracker-metric {
      display: grid;
      gap: 0.25rem;
      padding: 1rem;
      text-align: center;
      background: #f4f8f5;
      border: 1px solid
        rgba(31, 111, 89, 0.12);
      border-radius: 14px;
    }

    .tracker-metric span {
      color: var(--green-dark);
      font-size: 1.55rem;
      font-weight: 850;
    }

    .tracker-metric small {
      color: var(--muted);
      line-height: 1.4;
    }

    .tracker-sample-note {
      padding: 0.75rem 1rem;
      margin-top: 0.8rem;
      color: var(--muted);
      background: rgba(207, 153, 52, 0.08);
      border-radius: 12px;
      font-size: 0.86rem;
      line-height: 1.6;
    }

    .tracker-layout {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 1rem;
      margin-top: 1.2rem;
    }

    .tracker-card {
      padding: 1.2rem;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid
        rgba(31, 111, 89, 0.15);
      border-radius: 16px;
    }

    .tracker-card-heading {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .tracker-card-heading p {
      margin: 0;
      color: var(--green-dark);
      font-size: 0.78rem;
      font-weight: 850;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .tracker-card-heading h3 {
      margin: 0.35rem 0 0;
    }

    .tracker-badge {
      padding: 0.42rem 0.7rem;
      color: var(--green-dark);
      background: rgba(31, 111, 89, 0.09);
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 750;
      white-space: nowrap;
    }

    .tracker-current-job {
      padding: 0.9rem;
      margin: 1rem 0;
      color: #3e4846;
      background: #f7faf8;
      border-radius: 12px;
      line-height: 1.65;
    }

    .tracker-field-grid {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 0.8rem;
    }

    .tracker-field-grid label,
    .tracker-full-field {
      display: grid;
      gap: 0.42rem;
      margin-bottom: 0.9rem;
    }

    .tracker-field-grid span,
    .tracker-full-field span {
      font-size: 0.86rem;
      font-weight: 700;
    }

    .tracker-full-field b {
      color: #a34c45;
    }

    .tracker-card input,
    .tracker-card select,
    .tracker-card textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 0.72rem;
      color: var(--ink);
      background: white;
      border: 1px solid
        rgba(31, 44, 41, 0.16);
      border-radius: 10px;
      font: inherit;
    }

    .tracker-message {
      min-height: 1.4rem;
      margin: 0.75rem 0 0;
      color: var(--muted);
      font-size: 0.86rem;
      line-height: 1.55;
    }

    .tracker-message.error {
      color: #a33f38;
    }

    .tracker-history {
      margin-top: 1.2rem;
      overflow: hidden;
      border: 1px solid
        rgba(31, 111, 89, 0.14);
      border-radius: 16px;
    }

    .tracker-history summary {
      display: flex;
      justify-content: space-between;
      padding: 1rem 1.2rem;
      cursor: pointer;
      font-weight: 750;
      list-style: none;
    }

    .tracker-history-count {
      color: var(--muted);
      font-size: 0.85rem;
    }

    .tracker-records {
      display: grid;
      gap: 0.7rem;
      padding: 1rem;
      border-top: 1px solid
        rgba(31, 111, 89, 0.1);
    }

    .tracker-record {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr) auto;
      gap: 1rem;
      align-items: center;
      padding: 0.85rem;
      background: #f7faf8;
      border-radius: 12px;
    }

    .tracker-record h4 {
      margin: 0;
      line-height: 1.45;
    }

    .tracker-record p {
      margin: 0.35rem 0 0;
      color: var(--muted);
      font-size: 0.84rem;
      line-height: 1.5;
    }

    .tracker-comparison {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap: 0.8rem;
      margin-top: 1.2rem;
    }

    .tracker-comparison > div {
      padding: 1rem;
      background: #f4f8f5;
      border-radius: 14px;
    }

    .tracker-comparison h3 {
      margin: 0 0 0.55rem;
      font-size: 1rem;
    }

    .tracker-comparison p,
    #tracker-rejection-top {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
    }

    @media (max-width: 900px) {
      .tracker-metrics {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

      .tracker-layout,
      .tracker-comparison {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 560px) {
      .tracker-field-grid,
      .tracker-metrics {
        grid-template-columns: 1fr;
      }

      .tracker-card-heading,
      .tracker-record {
        align-items: flex-start;
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(
    style,
  );

  const element = (
    selector,
  ) =>
    panel.querySelector(
      selector,
    );

  function escapeHtml(value) {
    return String(
      value ?? "",
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value) {
    return String(
      value ?? "",
    )
      .toLowerCase()
      .replaceAll(/\s+/g, "");
  }

  function localDateKey(value) {
    if (!value) {
      return "";
    }

    return new Date(value)
      .toLocaleDateString(
        "zh-CN",
      );
  }

  function formatDate(value) {
    if (!value) {
      return "未记录";
    }

    return new Date(value)
      .toLocaleString(
        "zh-CN",
        {
          hour12: false,
        },
      );
  }

  function formatRate(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "—";
    }

    return `${(
      value * 100
    ).toFixed(1)}%`;
  }

  async function requestJson(
    url,
    options,
  ) {
    const response =
      await fetch(
        url,
        options,
      );

    const payload =
      await response.json();

    if (!response.ok) {
      throw new Error(
        payload.error ??
          "操作失败，请稍后重试。",
      );
    }

    return payload;
  }

  function setMessage(
    selector,
    message,
    isError = false,
  ) {
    const target =
      element(selector);

    target.textContent =
      message;

    target.classList.toggle(
      "error",
      isError,
    );
  }

  function setBusy(value) {
    busy = value;

    element(
      "#tracker-record-application",
    ).disabled =
      value ||
      !currentContext ||
      currentContext.result
        .decision === "REJECT" ||
      Boolean(currentRecordId);

    element(
      "#tracker-save-update",
    ).disabled =
      value ||
      !currentRecordId;
  }

  function findCurrentRecord() {
    if (
      !currentContext ||
      !snapshot
    ) {
      return null;
    }

    const today =
      new Date()
        .toLocaleDateString(
          "zh-CN",
        );

    return (
      snapshot.records.find(
        (record) =>
          normalize(
            record.companyName,
          ) ===
            normalize(
              currentContext
                .input
                .companyName,
            ) &&
          normalize(
            record.jobTitle,
          ) ===
            normalize(
              currentContext
                .input
                .jobTitle,
            ) &&
          normalize(
            record.sourcePlatform,
          ) ===
            normalize(
              currentContext
                .input
                .sourcePlatform,
            ) &&
          localDateKey(
            record
              .milestones
              .appliedAt,
          ) === today,
      ) ?? null
    );
  }

  function renderMetrics() {
    const summary =
      snapshot?.summary;

    element(
      "#metric-applications",
    ).textContent =
      summary
        ?.qualifiedApplications ??
      0;

    element(
      "#metric-reply-rate",
    ).textContent =
      formatRate(
        summary?.validReplyRate,
      );

    element(
      "#metric-interview-rate",
    ).textContent =
      formatRate(
        summary
          ?.interviewInviteRate,
      );

    element(
      "#metric-next-rate",
    ).textContent =
      formatRate(
        summary?.nextRoundRate,
      );

    element(
      "#metric-offers",
    ).textContent =
      summary?.offers ?? 0;

    const sampleNote =
      element(
        "#tracker-sample-note",
      );

    if (
      !summary ||
      summary.qualifiedApplications <
        30
    ) {
      sampleNote.textContent =
        `当前合格投递样本为 ${
          summary
            ?.qualifiedApplications ??
          0
        } 条，只报告趋势，不判断哪个简历版本一定更好。累计至少30条后再比较版本。`;
    } else {
      sampleNote.textContent =
        "当前样本已达到30条，可以开始比较不同岗位方向和简历版本的转化差异。";
    }

    const customizedCount =
      summary
        ?.customizedApplications ??
      0;

    const standardCount =
      summary
        ?.standardApplications ??
      0;

    element(
      "#tracker-customized-result",
    ).textContent =
      customizedCount === 0
        ? "暂无样本"
        : `${customizedCount}次合格投递，` +
          `${summary.customizedInterviews}次面试，` +
          `面试率${formatRate(
            summary
              .customizedInterviewRate,
          )}`;

    element(
      "#tracker-standard-result",
    ).textContent =
      standardCount === 0
        ? "暂无样本"
        : `${standardCount}次合格投递，` +
          `${summary.standardInterviews}次面试，` +
          `面试率${formatRate(
            summary
              .standardInterviewRate,
          )}`;

    const rejectionReasons =
      summary
        ?.rejectionReasonsTop3 ??
      [];

    element(
      "#tracker-rejection-top",
    ).innerHTML =
      rejectionReasons.length === 0
        ? "暂无数据"
        : `<ol>${rejectionReasons
            .map(
              (item) =>
                `<li>${escapeHtml(
                  item.reason,
                )}（${item.count}）</li>`,
            )
            .join("")}</ol>`;
  }

  function renderRecords() {
    const records =
      snapshot?.records ?? [];

    element(
      "#tracker-history-count",
    ).textContent =
      `${records.length} 条`;

    const container =
      element(
        "#tracker-records",
      );

    if (
      records.length === 0
    ) {
      container.innerHTML = `
        <p class="empty">
          还没有真实投递记录。
        </p>
      `;

      return;
    }

    container.innerHTML =
      records
        .slice(0, 30)
        .map(
          (record) => `
            <article class="tracker-record">
              <div>
                <h4>
                  ${escapeHtml(
                    record.companyName,
                  )}｜${escapeHtml(
                    record.jobTitle,
                  )}
                </h4>

                <p>
                  ${escapeHtml(
                    statusLabels[
                      record.status
                    ] ??
                      record.status,
                  )} ·
                  ${escapeHtml(
                    record.sourcePlatform,
                  )} ·
                  ${escapeHtml(
                    formatDate(
                      record
                        .milestones
                        .appliedAt,
                    ),
                  )}
                </p>
              </div>

              <button
                type="button"
                class="mini-button"
                data-application-id="${escapeHtml(
                  record.applicationId,
                )}"
              >
                更新进展
              </button>
            </article>
          `,
        )
        .join("");

    for (
      const button of
      container.querySelectorAll(
        "[data-application-id]",
      )
    ) {
      button.addEventListener(
        "click",
        () => {
          currentRecordId =
            button.dataset
              .applicationId;

          renderSelectedRecord();

          element(
            "#tracker-update-card",
          ).scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        },
      );
    }
  }

  function renderCurrentJob() {
    const currentJob =
      element(
        "#tracker-current-job",
      );

    const badge =
      element(
        "#tracker-current-badge",
      );

    const createButton =
      element(
        "#tracker-record-application",
      );

    if (!currentContext) {
      currentJob.textContent =
        "请先在上方完成一个岗位分析。";

      badge.textContent =
        "等待岗位分析";

      createButton.disabled =
        true;

      return;
    }

    const {
      input,
      result,
    } = currentContext;

    currentJob.innerHTML = `
      <strong>
        ${escapeHtml(
          input.companyName ??
            "未提供公司",
        )}｜
        ${escapeHtml(
          input.jobTitle ??
            result.actualRole,
        )}
      </strong>

      <br />

      结论：
      ${escapeHtml(
        result.decisionSummary,
      )}

      <br />

      推荐简历：
      ${escapeHtml(
        result.resumeBaseVersion,
      )}
    `;

    if (
      result.decision ===
      "REJECT"
    ) {
      badge.textContent =
        "岗位已淘汰";

      createButton.disabled =
        true;

      return;
    }

    const existing =
      findCurrentRecord();

    if (existing) {
      currentRecordId =
        existing.applicationId;

      badge.textContent =
        "今天已记录";

      createButton.disabled =
        true;

      renderSelectedRecord();

      return;
    }

    currentRecordId = null;

    badge.textContent =
      "等待实际投递";

    createButton.disabled =
      busy;

    element(
      "#tracker-customized",
    ).value =
      result.resumeAction ===
        "NO_EDIT"
        ? "false"
        : "true";

    element(
      "#tracker-time-cost",
    ).value = "0";

    element(
      "#tracker-create-notes",
    ).value = "";

    renderSelectedRecord();
  }

  function renderSelectedRecord() {
    const updateCard =
      element(
        "#tracker-update-card",
      );

    const record =
      snapshot?.records.find(
        (item) =>
          item.applicationId ===
          currentRecordId,
      );

    if (!record) {
      updateCard.classList.add(
        "hidden",
      );

      return;
    }

    updateCard.classList.remove(
      "hidden",
    );

    element(
      "#tracker-selected-status",
    ).textContent =
      statusLabels[
        record.status
      ] ?? record.status;

    element(
      "#tracker-selected-job",
    ).innerHTML = `
      <strong>
        ${escapeHtml(
          record.companyName,
        )}｜
        ${escapeHtml(
          record.jobTitle,
        )}
      </strong>

      <br />

      投递时间：
      ${escapeHtml(
        formatDate(
          record
            .milestones
            .appliedAt,
        ),
      )}
    `;

    element(
      "#tracker-status",
    ).value =
      record.status;

    element(
      "#tracker-follow-up",
    ).value =
      record.followUpDate ?? "";

    element(
      "#tracker-rejection-reason",
    ).value =
      record.rejectionReason ??
      "";

    element(
      "#tracker-update-notes",
    ).value =
      record.notes ?? "";

    updateRejectionField();
  }

  function renderAll() {
    renderMetrics();
    renderRecords();
    renderCurrentJob();
  }

  async function loadSnapshot() {
    try {
      snapshot =
        await requestJson(
          "/api/applications",
        );

      renderAll();
    } catch (error) {
      setMessage(
        "#tracker-create-message",
        error instanceof Error
          ? error.message
          : String(error),
        true,
      );
    }
  }

  async function recordApplication() {
    if (
      busy ||
      !currentContext ||
      currentContext.result
        .decision === "REJECT"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "请确认：你已经在招聘平台完成最终投递或发送简历。只有确认后才会写入真实漏斗。",
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);

    setMessage(
      "#tracker-create-message",
      "正在保存投递记录……",
    );

    try {
      const timeCost =
        Number(
          element(
            "#tracker-time-cost",
          ).value || 0,
        );

      const created =
        await requestJson(
          "/api/applications",
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body: JSON.stringify({
              input:
                currentContext.input,

              analysis:
                currentContext.result,

              details: {
                resumeVersion:
                  currentContext
                    .result
                    .resumeBaseVersion ===
                  "NONE"
                    ? undefined
                    : currentContext
                        .result
                        .resumeBaseVersion,

                customized:
                  element(
                    "#tracker-customized",
                  ).value === "true",

                timeCostMin:
                  Number.isFinite(
                    timeCost,
                  )
                    ? Math.max(
                        0,
                        Math.round(
                          timeCost,
                        ),
                      )
                    : 0,

                notes:
                  element(
                    "#tracker-create-notes",
                  ).value.trim() ||
                  undefined,
              },
            }),
          },
        );

      snapshot =
        created.snapshot;

      currentRecordId =
        created.record
          .applicationId;

      setMessage(
        "#tracker-create-message",
        "真实投递已经保存，可以继续更新HR已读、回复、面试等进展。",
      );

      renderAll();
    } catch (error) {
      setMessage(
        "#tracker-create-message",
        error instanceof Error
          ? error.message
          : String(error),
        true,
      );
    } finally {
      setBusy(false);
    }
  }

  function updateRejectionField() {
    const isRejected =
      element(
        "#tracker-status",
      ).value === "REJECTED";

    element(
      "#tracker-rejection-field",
    ).classList.toggle(
      "hidden",
      !isRejected,
    );
  }

  async function saveUpdate() {
    if (
      busy ||
      !currentRecordId
    ) {
      return;
    }

    const status =
      element(
        "#tracker-status",
      ).value;

    const rejectionReason =
      element(
        "#tracker-rejection-reason",
      ).value.trim();

    if (
      status === "REJECTED" &&
      !rejectionReason
    ) {
      setMessage(
        "#tracker-update-message",
        "记录拒绝时必须填写原因；如果HR没有说明，请填写“未收到明确原因”。",
        true,
      );

      return;
    }

    setBusy(true);

    setMessage(
      "#tracker-update-message",
      "正在保存进展……",
    );

    try {
      const updated =
        await requestJson(
          `/api/applications/${currentRecordId}`,
          {
            method: "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body: JSON.stringify({
              status,

              rejectionReason:
                status ===
                "REJECTED"
                  ? rejectionReason
                  : undefined,

              followUpDate:
                element(
                  "#tracker-follow-up",
                ).value ||
                null,

              notes:
                element(
                  "#tracker-update-notes",
                ).value.trim() ||
                null,
            }),
          },
        );

      snapshot =
        updated.snapshot;

      setMessage(
        "#tracker-update-message",
        "招聘进展已经保存，漏斗数据已更新。",
      );

      renderAll();
    } catch (error) {
      setMessage(
        "#tracker-update-message",
        error instanceof Error
          ? error.message
          : String(error),
        true,
      );
    } finally {
      setBusy(false);
    }
  }

  element(
    "#tracker-record-application",
  ).addEventListener(
    "click",
    recordApplication,
  );

  element(
    "#tracker-save-update",
  ).addEventListener(
    "click",
    saveUpdate,
  );

  element(
    "#tracker-refresh",
  ).addEventListener(
    "click",
    loadSnapshot,
  );

  element(
    "#tracker-status",
  ).addEventListener(
    "change",
    updateRejectionField,
  );

  window.addEventListener(
    "willow:analysis-ready",
    (event) => {
      currentContext =
        event.detail;

      currentRecordId = null;

      setMessage(
        "#tracker-create-message",
        "",
      );

      setMessage(
        "#tracker-update-message",
        "",
      );

      renderCurrentJob();
    },
  );

  window.addEventListener(
    "willow:analysis-cleared",
    () => {
      currentContext = null;
      currentRecordId = null;
      renderCurrentJob();
      renderSelectedRecord();
    },
  );

  void loadSnapshot();
})();