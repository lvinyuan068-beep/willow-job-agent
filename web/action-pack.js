(() => {
  let currentPack = null;

  function text(value) {
    if (
      value === null ||
      value === undefined
    ) {
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
    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return `
        <p class="action-empty">
          ${escapeHtml(emptyText)}
        </p>
      `;
    }

    return `
      <ul>
        ${items
          .map(
            (item) =>
              `<li>${escapeHtml(item)}</li>`,
          )
          .join("")}
      </ul>
    `;
  }

  const resultsSection =
    document.querySelector("#results");

  const auditPanel =
    resultsSection.querySelector(
      ".audit-panel",
    );

  const panel =
    document.createElement("section");

  panel.id = "action-pack-panel";
  panel.className =
    "panel action-pack-panel hidden";

  panel.innerHTML = `
    <div class="section-heading compact">
      <div>
        <p class="section-number">
          03 / 求职执行包
        </p>

        <h2>
          从建议进入实际执行
        </h2>

        <p class="action-pack-lead">
          所有文本均来自已核验证据库。
          旧PDF只作为排版参考，不作为事实来源。
        </p>
      </div>
    </div>

    <div class="action-pack-stack">
      <details
        class="action-detail"
        open
      >
        <summary>
          <span>
            1 · 可复制的定向简历正文
          </span>

          <span class="detail-hint">
            金字塔结构
          </span>
        </summary>

        <div class="action-detail-body">
          <div
            id="action-resume-meta"
            class="action-meta"
          ></div>

          <div class="action-toolbar">
            <button
              type="button"
              class="mini-button"
              data-copy-kind="resume"
            >
              复制完整简历文本
            </button>
          </div>

          <pre
            id="action-resume-text"
            class="copy-ready-text"
          ></pre>

          <div class="action-two-column">
            <div>
              <h4>本次修改重点</h4>
              <div
                id="action-resume-changes"
              ></div>
            </div>

            <div>
              <h4>禁止使用的表述</h4>
              <div
                id="action-resume-boundaries"
              ></div>
            </div>
          </div>
        </div>
      </details>

      <details class="action-detail">
        <summary>
          <span>
            2 · 逐题面试示例答案
          </span>

          <span
            id="action-interview-count"
            class="detail-hint"
          ></span>
        </summary>

        <div
          id="action-interview-list"
          class="action-detail-body"
        ></div>
      </details>

      <details class="action-detail">
        <summary>
          <span>
            3 · 短期补齐与作品集执行模板
          </span>

          <span
            id="action-guide-count"
            class="detail-hint"
          ></span>
        </summary>

        <div
          id="action-guide-list"
          class="action-detail-body"
        ></div>
      </details>
    </div>
  `;

  auditPanel.insertAdjacentElement(
    "beforebegin",
    panel,
  );

  const style =
    document.createElement("style");

  style.textContent = `
    .action-pack-panel {
      margin-top: 1.5rem;
    }

    .action-pack-lead {
      margin: 0.45rem 0 0;
      color: var(--muted);
      line-height: 1.7;
    }

    .action-pack-stack {
      display: grid;
      gap: 1rem;
      margin-top: 1.2rem;
    }

    .action-detail {
      overflow: hidden;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(31, 111, 89, 0.16);
      border-radius: 18px;
    }

    .action-detail summary {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      padding: 1.1rem 1.25rem;
      cursor: pointer;
      font-size: 1.05rem;
      font-weight: 750;
      list-style: none;
    }

    .action-detail summary::-webkit-details-marker {
      display: none;
    }

    .action-detail[open] summary {
      color: var(--green-dark);
      border-bottom: 1px solid rgba(31, 111, 89, 0.12);
    }

    .detail-hint {
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 650;
    }

    .action-detail-body {
      padding: 1.25rem;
    }

    .action-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      margin-bottom: 1rem;
    }

    .action-chip {
      padding: 0.42rem 0.72rem;
      color: var(--green-dark);
      background: rgba(31, 111, 89, 0.09);
      border-radius: 999px;
      font-size: 0.84rem;
      font-weight: 650;
    }

    .action-toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 0.65rem;
    }

    .copy-ready-text {
      max-height: 34rem;
      margin: 0;
      padding: 1.1rem;
      overflow: auto;
      white-space: pre-wrap;
      color: var(--ink);
      background: #f7faf8;
      border: 1px solid rgba(31, 111, 89, 0.12);
      border-radius: 14px;
      font-family: "Microsoft YaHei", sans-serif;
      font-size: 0.93rem;
      line-height: 1.8;
    }

    .action-two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1.2rem;
    }

    .interview-answer,
    .execution-guide {
      padding: 1rem;
      margin-bottom: 0.9rem;
      background: #f8faf9;
      border: 1px solid rgba(31, 111, 89, 0.12);
      border-radius: 14px;
    }

    .interview-answer:last-child,
    .execution-guide:last-child {
      margin-bottom: 0;
    }

    .item-heading {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 0.8rem;
    }

    .item-heading h4 {
      margin: 0;
      line-height: 1.55;
    }

    .quality-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.7rem;
    }

    .quality-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.32rem 0.62rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 750;
    }

    .quality-badge.pass {
      color: #166534;
      background: #dcfce7;
    }

    .quality-badge.review {
      color: #9a3412;
      background: #ffedd5;
    }

    .interview-answer.review-required {
      border-color: rgba(194, 65, 12, 0.34);
      background: #fffaf5;
    }

    .quality-issues {
      padding: 0.8rem 1rem;
      margin: 0.7rem 0 1rem;
      color: #9a3412;
      background: #fff7ed;
      border-radius: 10px;
    }

    .quality-issues h4 {
      margin: 0 0 0.45rem;
    }

    .mini-button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .answer-text {
      padding: 0.9rem;
      margin: 0.6rem 0 1rem;
      white-space: pre-wrap;
      line-height: 1.8;
      background: white;
      border-left: 3px solid var(--green);
      border-radius: 0 10px 10px 0;
    }

    .execution-meta {
      margin: 0 0 0.8rem;
      color: var(--muted);
      line-height: 1.65;
    }

    .execution-template {
      padding: 0.9rem;
      white-space: pre-wrap;
      line-height: 1.7;
      background: white;
      border-radius: 10px;
    }

    .action-empty {
      color: var(--muted);
    }

    @media (max-width: 800px) {
      .action-two-column {
        grid-template-columns: 1fr;
      }

      .item-heading {
        flex-direction: column;
      }
    }
  `;

  document.head.appendChild(style);

  async function copyText(
    value,
    button,
  ) {
    try {
      await navigator.clipboard.writeText(
        value,
      );
    } catch {
      const area =
        document.createElement(
          "textarea",
        );

      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }

    const original =
      button.textContent;

    button.textContent = "已复制";

    setTimeout(() => {
      button.textContent = original;
    }, 1500);
  }

  function interviewCopyText(item) {
    const status =
      item.qualityStatus ??
      "REVIEW_REQUIRED";

    const issues =
      Array.isArray(item.qualityIssues)
        ? item.qualityIssues
        : [];

    return [
      `问题：${item.question}`,
      `质量状态：${
        status === "PASS"
          ? "通过"
          : "需要人工复核"
      }`,
      ...(
        issues.length > 0
          ? [
              "",
              "质量问题：",
              ...issues.map(
                (value) => `- ${value}`,
              ),
            ]
          : []
      ),
      "",
      "示例答案：",
      item.answer,
      "",
      "使用证据：",
      ...item.evidence.map(
        (value) => `- ${value}`,
      ),
      "",
      "可能追问：",
      ...item.followUps.map(
        (value) => `- ${value}`,
      ),
      "",
      "注意事项：",
      ...item.cautions.map(
        (value) => `- ${value}`,
      ),
    ].join("\n");
  }
  function guideCopyText(item) {
    return [
      item.title,
      `优先级：${item.priority}`,
      `推荐格式：${item.recommendedFormat}`,
      `预计耗时：${item.estimatedHours}小时`,
      `原因：${item.reason}`,
      "",
      "执行步骤：",
      ...item.steps.map(
        (value, index) =>
          `${index + 1}. ${value}`,
      ),
      "",
      "交付模板：",
      item.deliverableTemplate,
      "",
      "验收标准：",
      ...item.acceptanceCriteria.map(
        (value) => `- ${value}`,
      ),
    ].join("\n");
  }

  function renderInterviewAnswers(
    items,
  ) {
    const passed =
      items.filter(
        (item) =>
          item.qualityStatus ===
          "PASS",
      ).length;

    const review =
      items.length - passed;

    document.querySelector(
      "#action-interview-count",
    ).textContent = review > 0
      ? `${items.length}道 · ${passed}道通过 · ${review}道需复核`
      : `${items.length}道 · 全部通过`;

    document.querySelector(
      "#action-interview-list",
    ).innerHTML = items
      .map(
        (item, index) => {
          const status =
            item.qualityStatus ??
            "REVIEW_REQUIRED";

          const isPass =
            status === "PASS";

          const issues =
            Array.isArray(
              item.qualityIssues,
            )
              ? item.qualityIssues
              : [];

          return `
            <article
              class="interview-answer ${
                isPass
                  ? "quality-pass"
                  : "review-required"
              }"
            >
              <div class="item-heading">
                <h4>
                  ${index + 1}.
                  ${escapeHtml(item.question)}
                </h4>

                <button
                  type="button"
                  class="mini-button"
                  data-copy-kind="interview"
                  data-copy-index="${index}"
                  ${
                    isPass
                      ? ""
                      : "disabled"
                  }
                >
                  ${
                    isPass
                      ? "复制本题"
                      : "需复核，暂不复制"
                  }
                </button>
              </div>

              <div class="quality-row">
                <span
                  class="quality-badge ${
                    isPass
                      ? "pass"
                      : "review"
                  }"
                >
                  ${
                    isPass
                      ? "质量检查通过"
                      : "需要人工复核"
                  }
                </span>

                <span class="detail-hint">
                  意图：
                  ${escapeHtml(
                    item.intent ??
                    "未识别",
                  )}
                </span>
              </div>

              ${
                !isPass
                  ? `
                    <div class="quality-issues">
                      <h4>生成质量提醒</h4>
                      ${listHtml(
                        issues,
                        "答案需要人工复核。",
                      )}
                    </div>
                  `
                  : ""
              }

              <p class="answer-text">
                ${escapeHtml(item.answer)}
              </p>

              <div class="action-two-column">
                <div>
                  <h4>使用证据</h4>
                  ${listHtml(item.evidence)}
                </div>

                <div>
                  <h4>可能追问</h4>
                  ${listHtml(item.followUps)}
                </div>
              </div>

              <h4>注意事项</h4>
              ${listHtml(item.cautions)}
            </article>
          `;
        },
      )
      .join("");
  }
  function renderExecutionGuides(
    items,
  ) {
    document.querySelector(
      "#action-guide-count",
    ).textContent =
      `${items.length}项任务`;

    document.querySelector(
      "#action-guide-list",
    ).innerHTML = items
      .map(
        (item, index) => `
          <article class="execution-guide">
            <div class="item-heading">
              <h4>
                ${escapeHtml(item.priority)}
                ·
                ${escapeHtml(item.title)}
              </h4>

              <button
                type="button"
                class="mini-button"
                data-copy-kind="guide"
                data-copy-index="${index}"
              >
                复制模板
              </button>
            </div>

            <p class="execution-meta">
              推荐格式：
              ${escapeHtml(item.recommendedFormat)}
              ｜预计
              ${escapeHtml(item.estimatedHours)}
              小时
            </p>

            <p>
              ${escapeHtml(item.reason)}
            </p>

            <h4>执行步骤</h4>
            ${listHtml(
              item.steps.map(
                (step, stepIndex) =>
                  `${stepIndex + 1}. ${step}`,
              ),
            )}

            <h4>交付模板</h4>
            <pre class="execution-template">${
              escapeHtml(
                item.deliverableTemplate,
              )
            }</pre>

            <h4>验收标准</h4>
            ${listHtml(
              item.acceptanceCriteria,
            )}
          </article>
        `,
      )
      .join("");
  }

  function render(pack) {
    currentPack = pack ?? null;

    if (!currentPack) {
      panel.classList.add("hidden");
      return;
    }

    panel.classList.remove("hidden");

    const resume =
      currentPack.resume;

    document.querySelector(
      "#action-resume-meta",
    ).innerHTML = [
      resume.targetRole,
      ...resume.jdKeywords,
    ]
      .map(
        (value) =>
          `<span class="action-chip">${
            escapeHtml(value)
          }</span>`,
      )
      .join("");

    document.querySelector(
      "#action-resume-text",
    ).textContent =
      resume.copyReadyText;

    document.querySelector(
      "#action-resume-changes",
    ).innerHTML =
      listHtml(
        resume.changeSummary,
        "无需额外修改。",
      );

    document.querySelector(
      "#action-resume-boundaries",
    ).innerHTML =
      listHtml(
        resume.evidenceBoundaries,
        "暂无额外证据限制。",
      );

    renderInterviewAnswers(
      currentPack.interviewAnswers ??
        [],
    );

    renderExecutionGuides(
      currentPack.executionGuides ??
        [],
    );
  }

  panel.addEventListener(
    "click",
    async (event) => {
      const button =
        event.target.closest(
          "button[data-copy-kind]",
        );

      if (
        !button ||
        !currentPack
      ) {
        return;
      }

      const kind =
        button.dataset.copyKind;

      const index = Number(
        button.dataset.copyIndex,
      );

      if (kind === "resume") {
        await copyText(
          currentPack.resume
            .copyReadyText,
          button,
        );

        return;
      }

      if (
        kind === "interview" &&
        Number.isInteger(index)
      ) {
        const item =
          currentPack
            .interviewAnswers[index];

        if (item) {
          await copyText(
            interviewCopyText(item),
            button,
          );
        }

        return;
      }

      if (
        kind === "guide" &&
        Number.isInteger(index)
      ) {
        const item =
          currentPack
            .executionGuides[index];

        if (item) {
          await copyText(
            guideCopyText(item),
            button,
          );
        }
      }
    },
  );

  document
    .querySelector("#clear-button")
    .addEventListener(
      "click",
      () => {
        currentPack = null;
        panel.classList.add("hidden");
      },
    );

  window.renderWillowActionPack =
    render;
})();