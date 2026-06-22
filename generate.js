const crypto = require("node:crypto");

// 16 bytes * 2 = 32 hex characters
const secret = crypto.randomBytes(16).toString("hex");

console.log(secret);
// Example output: '4f7a9e21b8c3d5f6a7b8c9d0e1f2a3b4'
