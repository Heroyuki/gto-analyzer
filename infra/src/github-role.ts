import { aws_iam as iam } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
/** Initial provisioning uses an administrator profile; later dev deploys use OIDC. */
export function createGithubDeployRole(scope: Construct, account: string, providerArn: string, bucketArn: string, distributionId: string): iam.Role {
  if (providerArn !== `arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com`) throw new Error('GitHub OIDC provider ARNが対象アカウントと一致しません。');
  const provider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(scope, 'GithubProvider', providerArn);
  const role = new iam.Role(scope, 'GithubDevDeployRole', {
    assumedBy: new iam.OpenIdConnectPrincipal(provider, {
      StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com', 'token.actions.githubusercontent.com:sub': 'repo:Heroyuki/gto-analyzer:environment:dev' },
    }),
  });
  role.addToPolicy(new iam.PolicyStatement({ actions: ['sts:AssumeRole'], resources: ['deploy', 'file-publishing', 'lookup'].map(kind => `arn:aws:iam::${account}:role/cdk-hnb659fds-${kind}-role-${account}-ap-northeast-1`) }));
  role.addToPolicy(new iam.PolicyStatement({ actions: ['cloudformation:DescribeStacks'], resources: [`arn:aws:cloudformation:ap-northeast-1:${account}:stack/GtoAnalyzerSpotDev/*`] }));
  role.addToPolicy(new iam.PolicyStatement({ actions: ['s3:ListBucket'], resources: [bucketArn] }));
  role.addToPolicy(new iam.PolicyStatement({ actions: ['s3:GetObject', 's3:PutObject'], resources: [`${bucketArn}/assets/*`, `${bucketArn}/index.html`, `${bucketArn}/releases/*`] }));
  role.addToPolicy(new iam.PolicyStatement({ actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'], resources: [`arn:aws:cloudfront::${account}:distribution/${distributionId}`] }));
  return role;
}
