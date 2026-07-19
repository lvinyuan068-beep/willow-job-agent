import { z } from "zod";

const OptionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === ""
      ? undefined
      : value,
  z.string().trim().min(1).optional(),
);
export const AgentModeSchema = z.enum(["mock", "openai", "kimi", "deepseek"]);

export const DecisionSchema = z.enum([
  "APPLY",
  "APPLY_AFTER_EDIT",
  "VERIFY_FIRST",
  "REJECT",
]);

export const GradeSchema = z.enum(["A", "B", "C", "D", "X"]);

export const EvidenceLevelSchema = z.enum(["A", "B", "C", "D"]);

export const ConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const ResumeActionSchema = z.enum([
  "NO_EDIT",
  "LIGHT_EDIT",
  "TARGETED_EDIT",
  "NEW_VERSION",
  "DO_NOT_SUBMIT",
]);

export const BaseResumeSchema = z.enum([
  "AIGC_CONTENT_OPERATIONS",
  "AI_PRODUCT_OPERATIONS",
  "GENERAL_OPERATIONS",
  "NONE",
]);

export const MatchStatusSchema = z.enum([
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "UNSUPPORTED",
  "UNKNOWN",
  "SHORT_TERM_FILLABLE",
  "NOT_SHORT_TERM_FILLABLE",
]);

export const JobInputSchema = z
  .object({
    jobTitle: OptionalText,
    companyName: OptionalText,
    jobDescription: OptionalText,
    jobPostingImagePath: OptionalText,
    sourcePlatform: OptionalText,
    city: OptionalText,
    salaryText: OptionalText,
    workLocation: OptionalText,
    companyDescription: OptionalText,
    recruiterMessage: OptionalText,
    resumeVersion: OptionalText,
    userQuestion: OptionalText,
    requestedOutputs: z.array(z.string().trim().min(1)).optional(),
    localEvidenceReferences: z.array(z.string().trim().min(1)).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.jobDescription && !value.jobPostingImagePath) {
      context.addIssue({
        code: "custom",
        path: ["jobDescription"],
        message: "必须提供 JD 文本或岗位图片路径。",
      });
    }
  });

export const RiskFlagSchema = z
  .object({
    code: z.string().trim().min(1),
    severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
    finding: z.string().trim().min(1),
    evidence: z.string().trim().min(1),
    requiresVerification: z.boolean(),
  })
  .strict();

export const RequirementMatchSchema = z
  .object({
    requirement: z.string().trim().min(1),
    status: MatchStatusSchema,
    evidenceLevel: EvidenceLevelSchema.nullable(),
    evidenceSource: z.string().trim().min(1).nullable(),
    explanation: z.string().trim().min(1),
  })
  .strict();

export const EvidenceUsageSchema = z
  .object({
    claim: z.string().trim().min(1),
    level: EvidenceLevelSchema,
    source: z.string().trim().min(1),
    allowedUsage: z.string().trim().min(1),
  })
  .strict();

export const ScoreBreakdownSchema = z
  .object({
    recruiterVisibility: z.number().int().min(0).max(25),
    interviewLikelihood: z.number().int().min(0).max(25),
    offerFeasibility: z.number().int().min(0).max(20),
    careerValue: z.number().int().min(0).max(15),
    shortTermGapFeasibility: z.number().int().min(0).max(10),
    locationFeasibility: z.number().int().min(0).max(5),
    total: z.number().int().min(0).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    const calculatedTotal =
      value.recruiterVisibility +
      value.interviewLikelihood +
      value.offerFeasibility +
      value.careerValue +
      value.shortTermGapFeasibility +
      value.locationFeasibility;

    if (value.total !== calculatedTotal) {
      context.addIssue({
        code: "custom",
        path: ["total"],
        message: `总分应为 ${calculatedTotal}，当前填写为 ${value.total}。`,
      });
    }
  });

export const ResumeEditSchema = z
  .object({
    section: z.string().trim().min(1),
    action: z.enum(["ADD", "REMOVE", "REWRITE", "REORDER", "KEEP"]),
    instruction: z.string().trim().min(1),
    evidenceSource: z.string().trim().min(1).nullable(),
  })
  .strict();

export const InterviewPreparationSchema = z
  .object({
    likelyQuestions: z.array(z.string().trim().min(1)),
    answerPoints: z.array(z.string().trim().min(1)),
    claimsToAvoid: z.array(z.string().trim().min(1)),
    questionsToAskEmployer: z.array(z.string().trim().min(1)),
  })
  .strict();

export const ShortTermSkillSchema = z
  .object({
    skill: z.string().trim().min(1),
    reason: z.string().trim().min(1),
    estimatedHours: z.number().int().min(1).max(80),
    verifiableDeliverable: z.string().trim().min(1),
    priority: z.enum(["P0", "P1", "P2"]),
  })
  .strict();

export const NextActionSchema = z
  .object({
    priority: z.enum(["P0", "P1", "P2"]),
    action: z.string().trim().min(1),
    deadline: z.string().trim().min(1).nullable(),
  })
  .strict();

export const JobAnalysisOutputSchema = z
  .object({
    schemaVersion: z.literal("2.0"),
    mode: AgentModeSchema,

    decision: DecisionSchema,
    grade: GradeSchema,
    decisionSummary: z.string().trim().min(1),

    actualRole: z.string().trim().min(1),

    hardFilter: z
      .object({
        status: z.enum(["PASSED", "FAILED", "UNKNOWN"]),
        reasons: z.array(z.string().trim().min(1)),
      })
      .strict(),

    riskFlags: z.array(RiskFlagSchema),
    missingInformation: z.array(z.string().trim().min(1)),

    rankingScore: z.number().int().min(0).max(100),
    scoreBreakdown: ScoreBreakdownSchema,
    scoreDeductions: z.array(z.string().trim().min(1)),

    interviewProbabilityBand: z.enum([
      "HIGH",
      "MEDIUM",
      "LOW",
      "NOT_APPLICABLE",
    ]),

    requirementMatch: z.array(RequirementMatchSchema),
    evidenceUsed: z.array(EvidenceUsageSchema),
    evidenceConflicts: z.array(z.string().trim().min(1)),

    resumeAction: ResumeActionSchema,
    resumeBaseVersion: BaseResumeSchema,
    resumeEdits: z.array(ResumeEditSchema),

    recruiterMessage: z.string(),

    interviewPreparation: InterviewPreparationSchema,
    shortTermSkillPlan: z.array(ShortTermSkillSchema),
    nextActions: z.array(NextActionSchema),

    confidence: ConfidenceSchema,
    limitations: z.array(z.string().trim().min(1)),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.rankingScore !== value.scoreBreakdown.total) {
      context.addIssue({
        code: "custom",
        path: ["rankingScore"],
        message: "rankingScore 必须等于 scoreBreakdown.total。",
      });
    }

    if (
      value.hardFilter.status === "FAILED" &&
      value.decision !== "REJECT"
    ) {
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message: "硬过滤失败时，decision 必须为 REJECT。",
      });
    }

    if (value.grade === "X" && value.decision !== "REJECT") {
      context.addIssue({
        code: "custom",
        path: ["grade"],
        message: "X 档岗位必须执行 REJECT。",
      });
    }

    if (value.decision === "REJECT" && value.resumeAction !== "DO_NOT_SUBMIT") {
      context.addIssue({
        code: "custom",
        path: ["resumeAction"],
        message: "拒绝投递时，resumeAction 必须为 DO_NOT_SUBMIT。",
      });
    }
  });

export type AgentMode = z.infer<typeof AgentModeSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type EvidenceLevel = z.infer<typeof EvidenceLevelSchema>;
export type JobInput = z.infer<typeof JobInputSchema>;
export type JobAnalysisOutput = z.infer<typeof JobAnalysisOutputSchema>;