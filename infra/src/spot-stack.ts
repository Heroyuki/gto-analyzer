import { isIP } from 'node:net';
import { Stack, CfnOutput, Duration, RemovalPolicy, aws_s3 as s3, aws_cloudfront as cloudfront, aws_cloudfront_origins as origins, aws_budgets as budgets, aws_cloudwatch as cloudwatch } from 'aws-cdk-lib';
import type { StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { createGithubDeployRole } from './github-role.js';
export interface SpotDevConfig { account: string; region: string; allowedIps: string[]; monthlyBudgetUsd: number; budgetEmail: string; githubOidcProviderArn?: string }
export function validateConfig(value: unknown): SpotDevConfig {
  if (!value || typeof value !== 'object') throw new Error('AWS dev設定が必要です。');
  const c = value as Record<string, unknown>;
  if (typeof c.account !== 'string' || !/^\d{12}$/.test(c.account)) throw new Error('accountは12桁のAWSアカウントIDです。');
  if (c.region !== 'ap-northeast-1') throw new Error('devのregionはap-northeast-1です。');
  if (!Array.isArray(c.allowedIps) || c.allowedIps.length < 1 || c.allowedIps.length > 20 || !c.allowedIps.every(ip => typeof ip === 'string' && isIP(ip) !== 0)) throw new Error('allowedIpsには1〜20件の公開IPv4/IPv6アドレスを指定してください（CIDR不可）。');
  if (typeof c.monthlyBudgetUsd !== 'number' || !Number.isFinite(c.monthlyBudgetUsd) || c.monthlyBudgetUsd <= 0) throw new Error('monthlyBudgetUsdは正の数です。');
  if (typeof c.budgetEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.budgetEmail)) throw new Error('budgetEmailが必要です。');
  if (c.githubOidcProviderArn !== undefined && c.githubOidcProviderArn !== `arn:aws:iam::${c.account}:oidc-provider/token.actions.githubusercontent.com`) throw new Error('GitHub OIDC provider ARNが不正です。');
  return c as unknown as SpotDevConfig;
}
export function viewerRequestCode(allowedIps: string[]): string {
  return `function handler(event) {
    var allowed = ${JSON.stringify(allowedIps)};
    if (allowed.indexOf(event.viewer.ip) === -1) {
      return {statusCode: 403, statusDescription: 'Forbidden', headers: {'cache-control': {value: 'no-store'}, 'content-type': {value: 'text/plain; charset=utf-8'}}, body: 'Forbidden'};
    }
    return event.request;
  }`;
}
export class SpotDevStack extends Stack {
  constructor(scope: Construct, id: string, config: SpotDevConfig, props?: StackProps) {
    super(scope, id, { ...props, env: { account: config.account, region: config.region } });
    const bucket = new s3.Bucket(this, 'WebBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true, versioned: true, removalPolicy: RemovalPolicy.RETAIN,
    });
    const access = new cloudfront.Function(this, 'ViewerAccess', { runtime: cloudfront.FunctionRuntime.JS_2_0, code: cloudfront.FunctionCode.fromInline(viewerRequestCode(config.allowedIps)) });
    const cache = new cloudfront.CachePolicy(this, 'WebCache', { minTtl: Duration.seconds(0), defaultTtl: Duration.seconds(60), maxTtl: Duration.days(365), enableAcceptEncodingBrotli: true, enableAcceptEncodingGzip: true });
    const headers = new cloudfront.ResponseHeadersPolicy(this, 'WebHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: { contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'", override: true },
        contentTypeOptions: { override: true }, frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER, override: true },
        strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
      },
    });
    const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      defaultRootObject: 'index.html', priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      defaultBehavior: { origin: origins.S3BucketOrigin.withOriginAccessControl(bucket), viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD, cachePolicy: cache, responseHeadersPolicy: headers,
        functionAssociations: [{ function: access, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      // Never translate missing asset responses or access failures into index.html.
    });
    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: { budgetName: `${id}-monthly`, budgetType: 'COST', timeUnit: 'MONTHLY', budgetLimit: { amount: config.monthlyBudgetUsd, unit: 'USD' } },
      notificationsWithSubscribers: [{ notification: { comparisonOperator: 'GREATER_THAN', notificationType: 'ACTUAL', threshold: 80, thresholdType: 'PERCENTAGE' }, subscribers: [{ address: config.budgetEmail, subscriptionType: 'EMAIL' }] }],
    });
    new cloudwatch.Dashboard(this, 'WebMetrics', { dashboardName: `${id}-web`, widgets: [
      [new cloudwatch.GraphWidget({ title: 'CloudFront requests / 5xx', left: [distribution.metricRequests({ region: 'us-east-1' })], right: [distribution.metric5xxErrorRate({ region: 'us-east-1' })] })],
    ] });
    if (config.githubOidcProviderArn) {
      const role = createGithubDeployRole(this, config.account, config.githubOidcProviderArn, bucket.bucketArn, distribution.distributionId);
      new CfnOutput(this, 'GithubDeployRoleArn', { value: role.roleArn });
    }
    new CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new CfnOutput(this, 'Url', { value: `https://${distribution.distributionDomainName}` });
  }
}
