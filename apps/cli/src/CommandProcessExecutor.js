import { spawn } from "child_process";

export class CommandProcessExecutor {
  execute(
    shellStatementText,
    activeExecutionDirectoryPath,
    streamOutput = false,
  ) {
    return new Promise((resolve) => {
      const stringifiedSanitizedStatement = String(shellStatementText);

      const instantiatedProcessChild = spawn(stringifiedSanitizedStatement, {
        cwd: activeExecutionDirectoryPath,
        env: { ...process.env },
        shell: true,
      });

      let logsOutputBufferString = "";

      instantiatedProcessChild.stdout.on("data", (chunkBytes) => {
        const text = chunkBytes.toString();
        logsOutputBufferString += text;
        if (streamOutput)
          process.stdout.write(`\x1b[2m    → ${text.trim()}\x1b[0m\n`);
      });

      instantiatedProcessChild.stderr.on("data", (chunkBytes) => {
        const text = chunkBytes.toString();
        logsOutputBufferString += text;
        if (streamOutput)
          process.stderr.write(`\x1b[2m    → ${text.trim()}\x1b[0m\n`);
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
