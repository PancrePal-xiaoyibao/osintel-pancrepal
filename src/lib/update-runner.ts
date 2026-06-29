export type UpdateRunnerInput = {
  currentCommit: string;
  nextCommit: string;
  build: () => Promise<{ ok: boolean }>;
  smokeTest: () => Promise<{ ok: boolean }>;
  rollback: () => Promise<void>;
};

export type UpdateRunnerResult = {
  ok: boolean;
  rollbackRequired: boolean;
};

export async function runUpdate(input: UpdateRunnerInput): Promise<UpdateRunnerResult> {
  const buildResult = await input.build();
  if (!buildResult.ok) {
    await input.rollback();
    return { ok: false, rollbackRequired: true };
  }

  const smokeResult = await input.smokeTest();
  if (!smokeResult.ok) {
    await input.rollback();
    return { ok: false, rollbackRequired: true };
  }

  return { ok: true, rollbackRequired: false };
}

export type CommandStep = {
  command: string;
  args: string[];
  label: string;
};

export type RunCommand = (step: CommandStep) => Promise<void>;

export type GitDrivenUpdateInput = {
  currentCommit: string;
  pullStep: CommandStep;
  buildSteps: CommandStep[];
  smokeSteps: CommandStep[];
  runCommand: RunCommand;
  getNextCommit: () => Promise<string>;
  rollback: (commit: string) => Promise<void>;
};

export type GitDrivenUpdateResult = UpdateRunnerResult & {
  currentCommit: string;
  nextCommit: string;
  pullSucceeded: boolean;
};

async function runStepSequence(steps: CommandStep[], runCommand: RunCommand): Promise<boolean> {
  try {
    for (const step of steps) {
      await runCommand(step);
    }
    return true;
  } catch {
    return false;
  }
}

export async function runGitDrivenUpdate(input: GitDrivenUpdateInput): Promise<GitDrivenUpdateResult> {
  try {
    await input.runCommand(input.pullStep);
  } catch {
    return {
      ok: false,
      rollbackRequired: false,
      currentCommit: input.currentCommit,
      nextCommit: input.currentCommit,
      pullSucceeded: false
    };
  }

  const nextCommit = await input.getNextCommit();

  const build = async () => ({ ok: await runStepSequence(input.buildSteps, input.runCommand) });
  const smokeTest = async () => ({ ok: await runStepSequence(input.smokeSteps, input.runCommand) });

  const result = await runUpdate({
    currentCommit: input.currentCommit,
    nextCommit,
    build,
    smokeTest,
    rollback: async () => {
      await input.rollback(input.currentCommit);
    }
  });

  return {
    ...result,
    currentCommit: input.currentCommit,
    nextCommit,
    pullSucceeded: true
  };
}

