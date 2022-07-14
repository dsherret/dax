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

/** `export ENV_VAR=VALUE` */
export interface SetEnvVarChange {
  kind: "envvar";
  name: string;
  value: string;
}

/** `ENV_VAR=VALUE` */
export interface SetShellVarChange {
  kind: "shellvar";
  name: string;
  value: string;
}

export interface CdChange {
  kind: "cd";
  dir: string;
}
