import { spawn } from "child_process";

export class CommandProcessExecutor {
  execute(shellStatementText, activeExecutionDirectoryPath) {
    return new Promise((resolve) => {
      const stringifiedSanitizedStatement = String(shellStatementText);

      const instantiatedProcessChild = spawn(stringifiedSanitizedStatement, {
        cwd: activeExecutionDirectoryPath,
        env: { ...process.env },
        shell: true,
      });

      let logsOutputBufferString = "";

      instantiatedProcessChild.stdout.on("data", (chunkBytes) => {
        logsOutputBufferString += chunkBytes.toString();
      });

      instantiatedProcessChild.stderr.on("data", (chunkBytes) => {
        logsOutputBufferString += chunkBytes.toString();
      });

      instantiatedProcessChild.on("close", (terminationExitCode) => {
        resolve({
          success: terminationExitCode === 0,
          output: logsOutputBufferString.trim(),
        });
      });
    });
  }
}
