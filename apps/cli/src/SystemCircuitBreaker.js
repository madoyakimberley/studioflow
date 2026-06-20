// A simple helper to make the code wait
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class SystemCircuitBreaker {
  constructor(
    endpointIdentityLabel,
    failureLimitThreshold = 3,
    cooldownWindowMs = 5000,
  ) {
    this.label = endpointIdentityLabel;
    this.failureLimit = failureLimitThreshold;
    this.cooldownWindow = cooldownWindowMs;
    this.state = "CLOSED";
    this.failureCount = 0;
    this.nextAttemptTimestamp = 0;
  }

  async execute(targetActionBlock) {
    // Keep trying until we hit the failure limit
    while (this.failureCount < this.failureLimit) {
      if (this.state === "OPEN") {
        if (Date.now() > this.nextAttemptTimestamp) {
          this.state = "HALF-OPEN";
          console.log(
            `🔄 [${this.label}]: Wait time over. Trying to connect again...`,
          );
        } else {
          console.error(
            `🛑 [${this.label}]: Connection completely failed. Pausing to prevent crashing.`,
          );
          throw new Error(`Safety pause is active for ${this.label}.`);
        }
      }

      try {
        const operationExecutionResult = await targetActionBlock();
        if (this.state === "HALF-OPEN") {
          this.state = "CLOSED";
          this.failureCount = 0;
          console.log(`✅ [${this.label}]: Connection is back to normal!`);
        }
        // If it works, return the result and break out of the loop
        return operationExecutionResult;
      } catch (actionError) {
        this.failureCount++;
        console.warn(
          `⚠️ [Error Recorded]: Connection failed (${this.failureCount}/${this.failureLimit})`,
        );

        if (this.failureCount >= this.failureLimit) {
          this.state = "OPEN";
          this.nextAttemptTimestamp = Date.now() + this.cooldownWindow;
          console.error(
            `🚨 [${this.label}]: Connection completely failed. Pausing to prevent crashing.`,
          );
          // Only throw the error if we are completely out of tries
          throw actionError;
        }

        // Wait 2 seconds before the loop tries again
        await wait(2000);
      }
    }
  }
}
