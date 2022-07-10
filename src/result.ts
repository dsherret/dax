export type ExecuteResult = ExitExecuteResult | ContinueExecuteResult;

export function resultFromCode(code: number): ContinueExecuteResult {
  return {
    kind: "continue",
    code,
  };
}

export interface ExitExecuteResult {
  kind: "exit";
  code: number;
}

export interface ContinueExecuteResult {
  kind: "continue";
  code: number;
  changes?: EnvChange[];
}

export type EnvChange = SetEnvVarChange | SetShellVarChange | CdChange;

export interface SetEnvVarChange {
  kind: "envvar";
  // todo...
}

export interface SetShellVarChange {
  kind: "shellvar";
  // todo...
}

export interface CdChange {
  kind: "cd";
  dir: string;
}
