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
    if (this.state === "OPEN") {
      if (Date.now() > this.nextAttemptTimestamp) {
        this.state = "HALF-OPEN";
        console.log(
          `🔄 [CIRCUIT BREAKER: ${this.label}]: Cooldown lapsed. Triaging connection safety metrics into HALF-OPEN mode.`,
        );
      } else {
        console.error(
          `🛑 [CIRCUIT BREAKER TRIPPED INTERCEPT]: Dev platform operation aborted. ${this.label} is currently isolating network drops.`,
        );
        throw new Error(
          `CircuitBreaker Protection Active for node layer ${this.label}`,
        );
      }
    }

    try {
      const operationExecutionResult = await targetActionBlock();
      if (this.state === "HALF-OPEN") {
        this.state = "CLOSED";
        this.failureCount = 0;
        console.log(
          `✅ [CIRCUIT BREAKER: ${this.label}]: Network parity verified perfectly. Re-closing breaker safety gates.`,
        );
      }
      return operationExecutionResult;
    } catch (actionError) {
      this.failureCount++;
      console.warn(
        `⚠️ [CIRCUIT BREAKER EXCEPTION RECORDED]: Fault logged index: (${this.failureCount}/${this.failureLimit})`,
      );

      if (this.failureCount >= this.failureLimit) {
        this.state = "OPEN";
        this.nextAttemptTimestamp = Date.now() + this.cooldownWindow;
        console.error(
          `🚨 [CRITICAL INFRASTRUCTURE BREAKER BLOWN]: Opening breaker circuit for ${this.label}. Routing isolation parameters active.`,
        );
      }
      throw actionError;
    }
  }
}
