import { App } from "aws-cdk-lib";
import { DevStack } from "../lib/dev-stack.ts";

const app = new App();

// Development runs in US East while the app is being built; production
// will get its own stack in Mumbai (ap-south-1).
new DevStack(app, "QuantifyDev", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" },
  smsProvider: app.node.tryGetContext("smsProvider") === "sns" ? "sns" : "console",
});
