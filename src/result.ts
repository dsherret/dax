/** Result of executing a custom command. */
export type ExecuteResult = ExitExecuteResult | ContinueExecuteResult;

export function resultFromCode(code: number): ContinueExecuteResult {
  return {
    kind: "continue",
    code,
  };
}

export function getAbortedResult(): ExecuteResult {
  return {
    kind: "exit",
    code: 124, // same as timeout command
  };
}

/** Tells the shell it should exit immediately with the provided exit code. */
export interface ExitExecuteResult {
  kind: "exit";
  code: number;
}

/** Tells the shell to continue executing. */
export interface ContinueExecuteResult {
  kind: "continue";
  code: number;
  changes?: EnvChange[];
}

/** Change that alters the environment.
 *
 * Used for registering custom commands.
 */
export type EnvChange = SetEnvVarChange | SetShellVarChange | CdChange;

/** Change that sets an environment variable (ex. `export ENV_VAR=VALUE`)
 *
 * Used for registering custom commands.
 */
export interface SetEnvVarChange {
  kind: "envvar";
  name: string;
  value: string;
}

/** Change that sets a shell variable (ex. `ENV_VAR=VALUE`)
 *
 * Used for registering custom commands.
 */
export interface SetShellVarChange {
  kind: "shellvar";
  name: string;
  value: string;
}

/** Change that alters the current working directory.
 *
 * Used for registering custom commands.
 */
export interface CdChange {
  kind: "cd";
  dir: string;
}
