# Willow Job Agent 🤖

AI 辅助个人求职决策工具 | Claude Code 辅助开发 | 本地部署运行

---

## 项目简介

独立使用 **Claude Code** 辅助开发的 AI 原生工具，围绕岗位筛选、简历定制、面试准备中的重复决策问题，形成「岗位判断→证据校验→定向简历→面试执行→投递留档」求职闭环。

**技术栈：** Node.js + TypeScript 后端，HTML/CSS/JS 前端，本地部署运行。

---

## 系统架构

五层架构设计：

- **输入层（Input Layer）**：网页表单、文本文件、JSON 输入
- **决策层（Decision Layer）**：硬过滤（10 条红线）、岗位分类、六大方向评分（100 分制）
- **AI 与研究层（AI & Research Layer）**：Kimi 主模型、DeepSeek 备用、Tavily 联网检索、故障自动切换
- **执行层（Execution Layer）**：定向简历生成、HR 话术、面试答案（8 题 + 补习指南）
- **质量层（Quality Layer）**：证据保护（16 块）、结构化校验、回归测试、结果存档（JSON）

---

## 核心模块（17 个）

| 模块 | 功能 |
|------|------|
| `CLI.ts` | 读取参数、载入岗位、显示首评结论 |
| `Text Input` | 解析文本岗位模板 |
| `Contracts` | 定义输入输出与跨字段校验规则 |
| `MO Engine` | 离线确定性规则引擎 |
| `Agent MO` | OpenAI 双模式路由 |
| `SR` | 本地网页服务 |
| `Resume Generator` | 定向简历生成 |
| `Resume Packaging` | 简历包装 |
| `Action Pack` | 执行指南生成 |
| `Interview Specialist` | 专项面试档案 |
| `Application Tracker` | 投递漏斗追踪（人工确认机制） |
| `Tavily` | 网页搜索 |
| `Complete Provider` | 模型故障切换 |

---

## 评测结果

| 评测层级 | 测试项 | 结果 |
|---------|--------|------|
| 本地规则 | 8 项（否定词误判、外包核实、经验门槛、地域阈值等） | ✅ 8/8 |
| 模型切换 | 3 项（Kimi 正常 / Kimi 故障切换 DeepSeek / 双模型失败） | ✅ 3/3 |
| 网页冒烟 | 7 项（首页加载、健康检测、岗位分析接口、结果展示、保存、执行包生成、历史记录读取） | ✅ 7/7 |
| API 接口 | 10 项 | ✅ 10/10 |
| 真实岗位 | 2 个端到端案例（AI 原生自由人、AIGC 运营、传统运营） | ✅ 2/2 |

---

## 迭代日志

- **C0.1** → 初期原型
- **C1.0** → 核心链路跑通
- **C2.0（当前）** → 新增求职补助包 + Application Tracker
- **C3.0 规划（待 7/23 算力刷新后）** → 接入写作 Skills 优化文本质量 + 重构 UI/UX 游戏化交互

---

## 演示

📹 [Demo 录屏（2-3 分钟）](willow agent demo.mp4
链接: https://pan.baidu.com/s/1NmRQIeXB1DXAoOAQB8RqCw 提取码: 1234 
--来自百度网盘超级会员v3的分享)

---

## 技术细节

- **开发方式：** Claude Code 辅助，独立设计产品逻辑
- **部署方式：** 本地 Node.js 服务运行
- **数据持久化：** 本地 JSON 文件存储
- **API 调用：** Kimi / DeepSeek / Tavily（通过后端代理，保护 API Key）

---

## 联系方式

吕沁远  
📧 1814082708@qq.com  
📱 15700015062
