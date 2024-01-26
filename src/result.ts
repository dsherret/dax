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
  /** Discriminator. */
  kind: "exit";
  /** Exit code to use and completely exit the shell with. */
  code: number;
}

/** Tells the shell to continue executing. */
export interface ContinueExecuteResult {
  /** Discriminator. */
  kind: "continue";
  /** Exit code to use. */
  code: number;
  /** Changes to the shell that should occur (ex. unsetting env vars). */
  changes?: EnvChange[];
}

/** Change that alters the environment.
 *
 * Used for registering custom commands.
 */
export type EnvChange = SetEnvVarChange | SetShellVarChange | UnsetVarChange | CdChange;

/** Change that sets an environment variable (ex. `export ENV_VAR=VALUE`)
 *
 * Used for registering custom commands.
 */
export interface SetEnvVarChange {
  /** Discriminator. */
  kind: "envvar";
  /** Name of the env var to set. */
  name: string;
  /** Value to set the env var to. */
  value: string;
}

/** Change that sets a shell variable (ex. `ENV_VAR=VALUE`)
 *
 * Used for registering custom commands.
 */
export interface SetShellVarChange {
  /** Discriminator. */
  kind: "shellvar";
  /** Name of the shell var to set. */
  name: string;
  /** Value to set the shell var to. */
  value: string;
}

/** Change that deletes the environment variable (ex. `unset ENV_VAR`).
 *
 * Used for registering custom commands.
 */
export interface UnsetVarChange {
  /** Discriminator. */
  kind: "unsetvar";
  /** Nave of the env var to unset. */
  name: string;
}

/** Change that alters the current working directory.
 *
 * Used for registering custom commands.
 */
export interface CdChange {
  /** Discriminator. */
  kind: "cd";
  /** Relative or absolute directory to change to. */
  dir: string;
}
