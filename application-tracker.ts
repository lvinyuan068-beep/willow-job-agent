import {
  randomUUID,
} from "node:crypto";

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";

import {
  dirname,
  resolve,
} from "node:path";

import {
  z,
} from "zod";

import {
  JobAnalysisOutputSchema,
  JobInputSchema,
  type JobAnalysisOutput,
  type JobInput,
} from "./contracts.js";

export const ApplicationStatusSchema =
  z.enum([
    "APPLIED",
    "HR_VIEWED",
    "VALID_REPLY",
    "SCREENING_PASSED",
    "TEST",
    "INTERVIEW",
    "NEXT_ROUND",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
  ]);

export type ApplicationStatus =
  z.infer<
    typeof ApplicationStatusSchema
  >;

const NullableTextSchema =
  z.string()
    .trim()
    .min(1)
    .nullable();

const OptionalNullableTextSchema =
  z.preprocess(
    (value) =>
      typeof value === "string" &&
      value.trim() === ""
        ? null
        : value,
    NullableTextSchema,
  ).optional();

const IsoTimestampSchema =
  z.string()
    .datetime({
      offset: true,
    });

const MilestonesSchema =
  z.object({
    appliedAt:
      IsoTimestampSchema.nullable(),

    hrViewedAt:
      IsoTimestampSchema.nullable(),

    validReplyAt:
      IsoTimestampSchema.nullable(),

    screeningPassedAt:
      IsoTimestampSchema.nullable(),

    testAt:
      IsoTimestampSchema.nullable(),

    interviewAt:
      IsoTimestampSchema.nullable(),

    nextRoundAt:
      IsoTimestampSchema.nullable(),

    offerAt:
      IsoTimestampSchema.nullable(),

    rejectedAt:
      IsoTimestampSchema.nullable(),

    withdrawnAt:
      IsoTimestampSchema.nullable(),
  })
    .strict();

export const ApplicationRecordSchema =
  z.object({
    schemaVersion:
      z.literal("1.0"),

    applicationId:
      z.string()
        .uuid(),

    createdAt:
      IsoTimestampSchema,

    updatedAt:
      IsoTimestampSchema,

    jobTitle:
      z.string()
        .trim()
        .min(1),

    companyName:
      z.string()
        .trim()
        .min(1),

    sourcePlatform:
      z.string()
        .trim()
        .min(1),

    city:
      NullableTextSchema,

    salaryText:
      NullableTextSchema,

    workLocation:
      NullableTextSchema,

    jobDescription:
      NullableTextSchema,

    actualRole:
      z.string()
        .trim()
        .min(1),

    decision:
      z.enum([
        "APPLY",
        "APPLY_AFTER_EDIT",
        "VERIFY_FIRST",
        "REJECT",
      ]),

    grade:
      z.enum([
        "A",
        "B",
        "C",
        "D",
        "X",
      ]),

    rankingScore:
      z.number()
        .int()
        .min(0)
        .max(100),

    hardFilterStatus:
      z.enum([
        "PASSED",
        "FAILED",
        "UNKNOWN",
      ]),

    riskLabels:
      z.array(
        z.string()
          .trim()
          .min(1),
      ),

    qualifiedApplication:
      z.boolean(),

    resumeVersion:
      NullableTextSchema,

    customized:
      z.boolean(),

    status:
      ApplicationStatusSchema,

    milestones:
      MilestonesSchema,

    rejectionReason:
      NullableTextSchema,

    followUpDate:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          "跟进日期必须使用 YYYY-MM-DD。",
        )
        .nullable(),

    timeCostMin:
      z.number()
        .int()
        .min(0)
        .max(1440),

    notes:
      NullableTextSchema,
  })
    .strict();

export type ApplicationRecord =
  z.infer<
    typeof ApplicationRecordSchema
  >;

export const ApplicationTrackerFileSchema =
  z.object({
    schemaVersion:
      z.literal("1.0"),

    updatedAt:
      IsoTimestampSchema,

    records:
      z.array(
        ApplicationRecordSchema,
      ),
  })
    .strict();

export type ApplicationTrackerFile =
  z.infer<
    typeof ApplicationTrackerFileSchema
  >;

const ApplicationUpdateSchema =
  z.object({
    status:
      ApplicationStatusSchema.optional(),

    resumeVersion:
      OptionalNullableTextSchema,

    customized:
      z.boolean()
        .optional(),

    rejectionReason:
      OptionalNullableTextSchema,

    followUpDate:
      z.preprocess(
        (value) =>
          typeof value === "string" &&
          value.trim() === ""
            ? null
            : value,
        z.string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            "跟进日期必须使用 YYYY-MM-DD。",
          )
          .nullable(),
      )
        .optional(),

    timeCostMin:
      z.number()
        .int()
        .min(0)
        .max(1440)
        .optional(),

    notes:
      OptionalNullableTextSchema,
  })
    .strict();

export type ApplicationUpdate =
  z.input<
    typeof ApplicationUpdateSchema
  >;

export interface CreateApplicationDetails {
  appliedAt?: string;
  resumeVersion?: string;
  customized?: boolean;
  timeCostMin?: number;
  notes?: string;
}

export interface FunnelReasonCount {
  reason: string;
  count: number;
}

export interface ApplicationFunnelSummary {
  generatedAt: string;

  totalRecords: number;
  qualifiedApplications: number;

  hrViewed: number;
  validReplies: number;
  screeningPassed: number;
  tests: number;
  interviews: number;
  nextRounds: number;
  offers: number;
  rejected: number;

  validReplyRate: number | null;
  interviewInviteRate: number | null;
  nextRoundRate: number | null;
  offerRate: number | null;

  customizedApplications: number;
  customizedInterviews: number;
  customizedInterviewRate:
    number | null;

  standardApplications: number;
  standardInterviews: number;
  standardInterviewRate:
    number | null;

  statusCounts:
    Record<
      ApplicationStatus,
      number
    >;

  rejectionReasonsTop3:
    FunnelReasonCount[];

  sampleStatus:
    | "TREND_ONLY"
    | "ENOUGH_FOR_COMPARISON";
}

export interface ApplicationTrackerSnapshot {
  schemaVersion: "1.0";
  generatedAt: string;
  trackerPath: string;
  records: ApplicationRecord[];
  summary: ApplicationFunnelSummary;
}

export interface ApplicationWriteResult {
  record: ApplicationRecord;
  snapshot: ApplicationTrackerSnapshot;
}

function nowIso(): string {
  return new Date()
    .toISOString();
}

function normalizeTimestamp(
  value: string | undefined,
  fieldName: string,
): string {
  if (!value) {
    return nowIso();
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      `${fieldName}不是有效时间。`,
    );
  }

  return parsed.toISOString();
}

function nullableText(
  value: string | undefined,
): string | null {
  const normalized =
    value?.trim();

  return normalized
    ? normalized
    : null;
}

function requiredText(
  value: string | undefined,
  fallback: string,
): string {
  const normalized =
    value?.trim();

  return normalized
    ? normalized
    : fallback;
}

function rate(
  numerator: number,
  denominator: number,
): number | null {
  if (denominator === 0) {
    return null;
  }

  return Number(
    (
      numerator /
      denominator
    ).toFixed(4),
  );
}

function normalizedFingerprint(
  record: Pick<
    ApplicationRecord,
    | "companyName"
    | "jobTitle"
    | "sourcePlatform"
  >,
): string {
  return [
    record.companyName,
    record.jobTitle,
    record.sourcePlatform,
  ]
    .map(
      (value) =>
        value
          .toLowerCase()
          .replace(/\s+/g, ""),
    )
    .join("|");
}

function sortRecords(
  records: ApplicationRecord[],
): ApplicationRecord[] {
  return [...records]
    .sort(
      (left, right) =>
        new Date(
          right.updatedAt,
        ).getTime() -
        new Date(
          left.updatedAt,
        ).getTime(),
    );
}

export function resolveApplicationTrackerPath(
  outputDirectory =
    resolve(
      process.cwd(),
      "outputs",
    ),
): string {
  return resolve(
    outputDirectory,
    "application-tracker.json",
  );
}

function emptyTracker():
  ApplicationTrackerFile {
  return {
    schemaVersion: "1.0",
    updatedAt: nowIso(),
    records: [],
  };
}

function readTrackerFile(
  trackerPath: string,
): ApplicationTrackerFile {
  if (
    !existsSync(trackerPath)
  ) {
    return emptyTracker();
  }

  try {
    const raw =
      readFileSync(
        trackerPath,
        "utf8",
      );

    return ApplicationTrackerFileSchema
      .parse(
        JSON.parse(raw) as unknown,
      );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    throw new Error(
      `投递记录文件无法读取：${message}`,
    );
  }
}

function writeTrackerFile(
  trackerPath: string,
  tracker: ApplicationTrackerFile,
): void {
  const validated =
    ApplicationTrackerFileSchema
      .parse(tracker);

  mkdirSync(
    dirname(trackerPath),
    {
      recursive: true,
    },
  );

  const temporaryPath =
    `${trackerPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    writeFileSync(
      temporaryPath,
      `${JSON.stringify(
        validated,
        null,
        2,
      )}\n`,
      "utf8",
    );

    renameSync(
      temporaryPath,
      trackerPath,
    );
  } catch (error) {
    if (
      existsSync(
        temporaryPath,
      )
    ) {
      rmSync(
        temporaryPath,
        {
          force: true,
        },
      );
    }

    throw error;
  }
}

function applyStatusMilestone(
  milestones:
    ApplicationRecord["milestones"],
  status: ApplicationStatus,
  timestamp: string,
): ApplicationRecord["milestones"] {
  const next = {
    ...milestones,
  };

  switch (status) {
    case "APPLIED":
      next.appliedAt ??=
        timestamp;
      break;

    case "HR_VIEWED":
      next.hrViewedAt ??=
        timestamp;
      break;

    case "VALID_REPLY":
      next.validReplyAt ??=
        timestamp;
      break;

    case "SCREENING_PASSED":
      next.screeningPassedAt ??=
        timestamp;
      break;

    case "TEST":
      next.testAt ??=
        timestamp;
      break;

    case "INTERVIEW":
      next.interviewAt ??=
        timestamp;
      break;

    case "NEXT_ROUND":
      next.nextRoundAt ??=
        timestamp;
      break;

    case "OFFER":
      next.offerAt ??=
        timestamp;
      break;

    case "REJECTED":
      next.rejectedAt ??=
        timestamp;
      break;

    case "WITHDRAWN":
      next.withdrawnAt ??=
        timestamp;
      break;
  }

  return MilestonesSchema.parse(
    next,
  );
}

export function summarizeApplicationFunnel(
  records: ApplicationRecord[],
): ApplicationFunnelSummary {
  const qualified =
    records.filter(
      (record) =>
        record.qualifiedApplication &&
        Boolean(
          record.milestones
            .appliedAt,
        ),
    );

  const countMilestone = (
    key:
      keyof ApplicationRecord[
        "milestones"
      ],
  ): number =>
    qualified.filter(
      (record) =>
        Boolean(
          record.milestones[key],
        ),
    ).length;

  const hrViewed =
    countMilestone(
      "hrViewedAt",
    );

  const validReplies =
    countMilestone(
      "validReplyAt",
    );

  const screeningPassed =
    countMilestone(
      "screeningPassedAt",
    );

  const tests =
    countMilestone(
      "testAt",
    );

  const interviews =
    countMilestone(
      "interviewAt",
    );

  const nextRounds =
    countMilestone(
      "nextRoundAt",
    );

  const offers =
    countMilestone(
      "offerAt",
    );

  const rejected =
    countMilestone(
      "rejectedAt",
    );

  const completedInitial =
    qualified.filter(
      (record) =>
        Boolean(
          record.milestones
            .interviewAt,
        ) ||
        Boolean(
          record.milestones
            .testAt,
        ),
    ).length;

  const customized =
    qualified.filter(
      (record) =>
        record.customized,
    );

  const standard =
    qualified.filter(
      (record) =>
        !record.customized,
    );

  const customizedInterviews =
    customized.filter(
      (record) =>
        Boolean(
          record.milestones
            .interviewAt,
        ),
    ).length;

  const standardInterviews =
    standard.filter(
      (record) =>
        Boolean(
          record.milestones
            .interviewAt,
        ),
    ).length;

  const statusCounts =
    Object.fromEntries(
      ApplicationStatusSchema
        .options
        .map(
          (status) => [
            status,
            records.filter(
              (record) =>
                record.status ===
                status,
            ).length,
          ],
        ),
    ) as Record<
      ApplicationStatus,
      number
    >;

  const rejectionReasonMap =
    new Map<string, number>();

  for (
    const record of records
  ) {
    if (
      !record.rejectionReason
    ) {
      continue;
    }

    rejectionReasonMap.set(
      record.rejectionReason,
      (
        rejectionReasonMap.get(
          record.rejectionReason,
        ) ?? 0
      ) + 1,
    );
  }

  const rejectionReasonsTop3 =
    [...rejectionReasonMap]
      .map(
        ([reason, count]) => ({
          reason,
          count,
        }),
      )
      .sort(
        (left, right) =>
          right.count -
          left.count,
      )
      .slice(0, 3);

  return {
    generatedAt: nowIso(),

    totalRecords:
      records.length,

    qualifiedApplications:
      qualified.length,

    hrViewed,
    validReplies,
    screeningPassed,
    tests,
    interviews,
    nextRounds,
    offers,
    rejected,

    validReplyRate:
      rate(
        validReplies,
        qualified.length,
      ),

    interviewInviteRate:
      rate(
        interviews,
        qualified.length,
      ),

    nextRoundRate:
      rate(
        nextRounds,
        completedInitial,
      ),

    offerRate:
      rate(
        offers,
        qualified.length,
      ),

    customizedApplications:
      customized.length,

    customizedInterviews,

    customizedInterviewRate:
      rate(
        customizedInterviews,
        customized.length,
      ),

    standardApplications:
      standard.length,

    standardInterviews,

    standardInterviewRate:
      rate(
        standardInterviews,
        standard.length,
      ),

    statusCounts,
    rejectionReasonsTop3,

    sampleStatus:
      qualified.length >= 30
        ? "ENOUGH_FOR_COMPARISON"
        : "TREND_ONLY",
  };
}

function buildSnapshot(
  trackerPath: string,
  tracker: ApplicationTrackerFile,
): ApplicationTrackerSnapshot {
  const records =
    sortRecords(
      tracker.records,
    );

  return {
    schemaVersion: "1.0",
    generatedAt: nowIso(),
    trackerPath,
    records,
    summary:
      summarizeApplicationFunnel(
        records,
      ),
  };
}

export function getApplicationTrackerSnapshot(
  outputDirectory?: string,
): ApplicationTrackerSnapshot {
  const trackerPath =
    resolveApplicationTrackerPath(
      outputDirectory,
    );

  return buildSnapshot(
    trackerPath,
    readTrackerFile(
      trackerPath,
    ),
  );
}

export function createApplicationRecord(
  input: JobInput,
  analysis: JobAnalysisOutput,
  details:
    CreateApplicationDetails = {},
  outputDirectory?: string,
): ApplicationWriteResult {
  const safeInput =
    JobInputSchema.parse(input);

  const safeAnalysis =
    JobAnalysisOutputSchema
      .parse(analysis);

  if (
    safeAnalysis.decision ===
      "REJECT" ||
    safeAnalysis.hardFilter
      .status === "FAILED"
  ) {
    throw new Error(
      "该岗位已被硬过滤淘汰，不能记录为已投递。",
    );
  }

  const trackerPath =
    resolveApplicationTrackerPath(
      outputDirectory,
    );

  const tracker =
    readTrackerFile(
      trackerPath,
    );

  const appliedAt =
    normalizeTimestamp(
      details.appliedAt,
      "投递时间",
    );

  const jobTitle =
    requiredText(
      safeInput.jobTitle,
      safeAnalysis.actualRole,
    );

  const companyName =
    requiredText(
      safeInput.companyName,
      "未提供公司名称",
    );

  const sourcePlatform =
    requiredText(
      safeInput.sourcePlatform,
      "未提供招聘平台",
    );

  const fingerprint =
    normalizedFingerprint({
      companyName,
      jobTitle,
      sourcePlatform,
    });

  const sameDayDuplicate =
    tracker.records.find(
      (record) =>
        normalizedFingerprint(
          record,
        ) === fingerprint &&
        record.milestones
          .appliedAt
          ?.slice(0, 10) ===
          appliedAt.slice(0, 10),
    );

  if (sameDayDuplicate) {
    throw new Error(
      `同一岗位当天已有投递记录：${sameDayDuplicate.applicationId}`,
    );
  }

  const hasStrongEvidence =
    safeAnalysis.evidenceUsed
      .some(
        (evidence) =>
          evidence.level === "A" ||
          evidence.level === "B",
      );

  const resumeVersion =
    nullableText(
      details.resumeVersion ??
        safeInput.resumeVersion ??
        (
          safeAnalysis
            .resumeBaseVersion ===
          "NONE"
            ? undefined
            : safeAnalysis
                .resumeBaseVersion
        ),
    );

  const record =
    ApplicationRecordSchema
      .parse({
        schemaVersion: "1.0",

        applicationId:
          randomUUID(),

        createdAt:
          appliedAt,

        updatedAt:
          appliedAt,

        jobTitle,
        companyName,
        sourcePlatform,

        city:
          nullableText(
            safeInput.city,
          ),

        salaryText:
          nullableText(
            safeInput.salaryText,
          ),

        workLocation:
          nullableText(
            safeInput.workLocation,
          ),

        jobDescription:
          nullableText(
            safeInput.jobDescription,
          ),

        actualRole:
          safeAnalysis.actualRole,

        decision:
          safeAnalysis.decision,

        grade:
          safeAnalysis.grade,

        rankingScore:
          safeAnalysis.rankingScore,

        hardFilterStatus:
          safeAnalysis
            .hardFilter
            .status,

        riskLabels:
          safeAnalysis.riskFlags
            .map(
              (risk) =>
                risk.code,
            ),

        qualifiedApplication:
          safeAnalysis
            .hardFilter
            .status ===
            "PASSED" &&
          hasStrongEvidence,

        resumeVersion,

        customized:
          details.customized ??
          false,

        status:
          "APPLIED",

        milestones:
          applyStatusMilestone(
            {
              appliedAt: null,
              hrViewedAt: null,
              validReplyAt: null,
              screeningPassedAt:
                null,
              testAt: null,
              interviewAt: null,
              nextRoundAt: null,
              offerAt: null,
              rejectedAt: null,
              withdrawnAt: null,
            },
            "APPLIED",
            appliedAt,
          ),

        rejectionReason:
          null,

        followUpDate:
          null,

        timeCostMin:
          details.timeCostMin ??
          0,

        notes:
          nullableText(
            details.notes,
          ),
      });

  const nextTracker =
    ApplicationTrackerFileSchema
      .parse({
        schemaVersion: "1.0",

        updatedAt:
          nowIso(),

        records:
          sortRecords([
            ...tracker.records,
            record,
          ]),
      });

  writeTrackerFile(
    trackerPath,
    nextTracker,
  );

  return {
    record,

    snapshot:
      buildSnapshot(
        trackerPath,
        nextTracker,
      ),
  };
}

export function updateApplicationRecord(
  applicationId: string,
  update: ApplicationUpdate,
  outputDirectory?: string,
): ApplicationWriteResult {
  const safeUpdate =
    ApplicationUpdateSchema
      .parse(update);

  const trackerPath =
    resolveApplicationTrackerPath(
      outputDirectory,
    );

  const tracker =
    readTrackerFile(
      trackerPath,
    );

  const index =
    tracker.records
      .findIndex(
        (record) =>
          record.applicationId ===
          applicationId,
      );

  if (index < 0) {
    throw new Error(
      `没有找到投递记录：${applicationId}`,
    );
  }

  const current =
    tracker.records[index];

  const timestamp =
    nowIso();

  const nextStatus =
    safeUpdate.status ??
    current.status;

  const nextRejectionReason =
    safeUpdate
      .rejectionReason !==
    undefined
      ? safeUpdate
          .rejectionReason
      : current
          .rejectionReason;

  if (
    nextStatus ===
      "REJECTED" &&
    !nextRejectionReason
  ) {
    throw new Error(
      "记录拒绝时必须填写拒绝原因；如果HR未说明，可填写“未收到明确原因”。",
    );
  }

  const updatedRecord =
    ApplicationRecordSchema
      .parse({
        ...current,

        updatedAt:
          timestamp,

        status:
          nextStatus,

        milestones:
          applyStatusMilestone(
            current.milestones,
            nextStatus,
            timestamp,
          ),

        resumeVersion:
          safeUpdate
            .resumeVersion !==
          undefined
            ? safeUpdate
                .resumeVersion
            : current
                .resumeVersion,

        customized:
          safeUpdate
            .customized ??
          current.customized,

        rejectionReason:
          nextRejectionReason,

        followUpDate:
          safeUpdate
            .followUpDate !==
          undefined
            ? safeUpdate
                .followUpDate
            : current
                .followUpDate,

        timeCostMin:
          safeUpdate
            .timeCostMin ??
          current.timeCostMin,

        notes:
          safeUpdate.notes !==
          undefined
            ? safeUpdate.notes
            : current.notes,
      });

  const records =
    [...tracker.records];

  records[index] =
    updatedRecord;

  const nextTracker =
    ApplicationTrackerFileSchema
      .parse({
        schemaVersion: "1.0",

        updatedAt:
          timestamp,

        records:
          sortRecords(
            records,
          ),
      });

  writeTrackerFile(
    trackerPath,
    nextTracker,
  );

  return {
    record:
      updatedRecord,

    snapshot:
      buildSnapshot(
        trackerPath,
        nextTracker,
      ),
  };
}