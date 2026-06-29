export type CheckIssue = {
  code: string;
  message: string;
};

export type CheckResult = {
  ok: boolean;
  issues: CheckIssue[];
};

