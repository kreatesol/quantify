# Quantify infrastructure

`QuantifyDev` is the development environment in AWS US East (`us-east-1`). GitHub Actions deploys it on every push to `main` (workflow: `.github/workflows/deploy-dev.yml`).

## What it creates

| Part | AWS service | Notes |
| --- | --- | --- |
| Web app and HTTPS | CloudFront + private S3 bucket | One URL serves the buyer web app and the API (`/auth/*`, `/me`, `/health`) |
| API | ECS Fargate (0.25 vCPU, 0.5 GB) behind an Application Load Balancer | Image built from `services/api/Dockerfile`; runs database migrations on start |
| Database | RDS PostgreSQL 16, `db.t4g.micro`, 20 GB, encrypted | In isolated subnets; password in Secrets Manager |
| Secrets | Secrets Manager | Database login, JWT and OTP signing keys, all generated |
| Logs | CloudWatch Logs | Login codes appear here while `SMS_PROVIDER` is `console` |

There is no NAT gateway, to keep costs down. Expect roughly US$40 to 50 a month while it runs (mostly the load balancer, the database and Fargate); check the AWS Pricing Calculator for current prices.

## One-time setup

You need an AWS account with administrator access for these steps. AWS CloudShell (in the AWS console, region N. Virginia) has everything needed.

1. **Bootstrap CDK** in the account and region:

   ```bash
   npx aws-cdk@2 bootstrap aws://<your-account-id>/us-east-1
   ```

2. **Create the GitHub deploy role** from `infra/github-deploy-role.yaml`. In the console: CloudFormation, Create stack, upload the file, name it `quantify-github-deploy`, and acknowledge IAM resources. Or in CloudShell:

   ```bash
   aws cloudformation deploy --region us-east-1 \
     --stack-name quantify-github-deploy \
     --template-file github-deploy-role.yaml \
     --capabilities CAPABILITY_NAMED_IAM
   ```

   If the account already has a GitHub identity provider (`token.actions.githubusercontent.com`), add `--parameter-overrides CreateOidcProvider=false`.

   The role can only be used by jobs in this repository's `development` environment, and it can do nothing except hand off to the roles CDK bootstrapped.

3. **Tell GitHub the role.** In the repository: Settings, Secrets and variables, Actions, Variables tab, New repository variable:
   - `AWS_DEPLOY_ROLE_ARN`: the `DeployRoleArn` output of the stack (for example `arn:aws:iam::123456789012:role/quantify-github-deploy`).
   - Optional `SMS_PROVIDER`: `sns` to send real SMS through AWS SNS. Leave it unset to keep codes in the logs. Sending to US numbers through SNS needs an approved origination number (such as a toll-free number) first.

4. **Deploy**: Actions, "Deploy development (AWS US East)", Run workflow. The first run takes about 15 to 20 minutes, mostly creating the database and CloudFront. The run summary shows the app URL.

For the phone apps, set `EXPO_PUBLIC_API_URL` to that URL.

## Working on the stack

```bash
cd infra
CDK_DEFAULT_ACCOUNT=123456789012 pnpm exec cdk synth   # check it builds, no AWS login needed
pnpm exec cdk diff                                     # needs AWS credentials
```

`cdk synth` packages `apps/buyer/dist`, so build the web app first (`pnpm --filter @quantify/buyer build:web`).

To remove the environment, delete the `QuantifyDev` stack in CloudFormation. The database is kept as a final snapshot, which you can delete separately.
