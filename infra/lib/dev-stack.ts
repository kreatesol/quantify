import { fileURLToPath } from "node:url";
import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as iam from "aws-cdk-lib/aws-iam";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

/** API paths CloudFront sends to the API instead of the web app. */
const API_PATHS = ["/auth/*", "/me", "/health"];

export type DevStackProps = StackProps & { smsProvider: "console" | "sns" };

/**
 * Development environment: the API on ECS Fargate behind a load balancer,
 * PostgreSQL on RDS, and the buyer web app on S3. One CloudFront domain
 * serves both the web app and the API over HTTPS.
 */
export class DevStack extends Stack {
  // Listed rather than looked up, so synth needs no AWS credentials.
  override get availabilityZones(): string[] {
    return ["us-east-1a", "us-east-1b"];
  }

  constructor(scope: Construct, id: string, props: DevStackProps) {
    super(scope, id, props);

    // No NAT gateway, to keep the bill low: the API runs in public subnets
    // with a public IP, and the database sits in isolated subnets.
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC },
        { name: "data", subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ],
    });

    const db = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      credentials: rds.Credentials.fromGeneratedSecret("quantify"),
      databaseName: "quantify",
      allocatedStorage: 20,
      backupRetention: Duration.days(1),
      storageEncrypted: true,
    });

    const jwtSecret = new secretsmanager.Secret(this, "JwtSecret", {
      generateSecretString: { passwordLength: 48, excludePunctuation: true },
    });
    const otpSecret = new secretsmanager.Secret(this, "OtpSecret", {
      generateSecretString: { passwordLength: 48, excludePunctuation: true },
    });

    const api = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "Api", {
      cluster: new ecs.Cluster(this, "Cluster", { vpc }),
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      // Start the new task before stopping the old one during a deploy.
      minHealthyPercent: 100,
      assignPublicIp: true,
      taskSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      circuitBreaker: { rollback: true },
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(repoRoot, { file: "services/api/Dockerfile" }),
        containerPort: 3000,
        environment: {
          PORT: "3000",
          ALLOWED_PHONE_COUNTRIES: "IN,US",
          SMS_PROVIDER: props.smsProvider,
          PGDATABASE: "quantify",
          PGSSLMODE: "require",
        },
        secrets: {
          PGHOST: ecs.Secret.fromSecretsManager(db.secret!, "host"),
          PGPORT: ecs.Secret.fromSecretsManager(db.secret!, "port"),
          PGUSER: ecs.Secret.fromSecretsManager(db.secret!, "username"),
          PGPASSWORD: ecs.Secret.fromSecretsManager(db.secret!, "password"),
          JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
          OTP_SECRET: ecs.Secret.fromSecretsManager(otpSecret),
        },
      },
    });
    api.targetGroup.configureHealthCheck({ path: "/health" });
    db.connections.allowDefaultPortFrom(api.service);

    if (props.smsProvider === "sns") {
      // SMS to a phone number has no topic ARN to scope the permission to.
      api.taskDefinition.taskRole.addToPrincipalPolicy(
        new iam.PolicyStatement({ actions: ["sns:Publish"], resources: ["*"] }),
      );
    }

    const site = new s3.Bucket(this, "WebBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    // The web app is a single page: every route without a file extension
    // loads index.html.
    const spaRewrite = new cloudfront.Function(this, "SpaRewrite", {
      code: cloudfront.FunctionCode.fromInline(
        "function handler(event) { var r = event.request; if (r.uri.indexOf('.') === -1) { r.uri = '/index.html'; } return r; }",
      ),
    });

    // The token travels in the Authorization header, which CloudFront only
    // forwards when it is part of the cache key. Responses are not cached:
    // the API sends no Cache-Control, so the default TTL of 0 applies.
    const apiCachePolicy = new cloudfront.CachePolicy(this, "ApiCachePolicy", {
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Authorization"),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1),
    });
    const apiBehavior: cloudfront.BehaviorOptions = {
      origin: new origins.LoadBalancerV2Origin(api.loadBalancer, {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: apiCachePolicy,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    };

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(site),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [{ function: spaRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      additionalBehaviors: Object.fromEntries(API_PATHS.map((path) => [path, apiBehavior])),
    });

    new s3deploy.BucketDeployment(this, "DeployWeb", {
      sources: [s3deploy.Source.asset(`${repoRoot}apps/buyer/dist`)],
      destinationBucket: site,
      distribution,
    });

    new CfnOutput(this, "AppUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "Buyer web app. Mobile builds use the same URL as EXPO_PUBLIC_API_URL.",
    });
  }
}
