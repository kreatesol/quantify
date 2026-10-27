import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

export interface SmsSender {
  send(toE164: string, message: string): Promise<void>;
}

/** Development sender: writes the message to the server log instead of sending it. */
export class ConsoleSmsSender implements SmsSender {
  constructor(private readonly log: { info(details: object, message: string): void }) {}

  async send(toE164: string, message: string): Promise<void> {
    this.log.info({ to: toE164, message }, "SMS (console provider, not sent)");
  }
}

/**
 * Sends through AWS SNS. Sending to US numbers requires a registered
 * origination number (for example a toll-free number) in the SNS account.
 */
export class SnsSmsSender implements SmsSender {
  private readonly client: SNSClient;

  constructor(region: string) {
    this.client = new SNSClient({ region });
  }

  async send(toE164: string, message: string): Promise<void> {
    await this.client.send(
      new PublishCommand({
        PhoneNumber: toE164,
        Message: message,
        MessageAttributes: {
          "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: "Transactional" },
        },
      }),
    );
  }
}
