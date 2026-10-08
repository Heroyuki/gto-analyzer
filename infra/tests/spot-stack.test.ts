import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SpotDevStack, validateConfig, viewerRequestCode } from '../src/spot-stack.js';
const config = { account: '123456789012', region: 'ap-northeast-1', allowedIps: ['203.0.113.10'], monthlyBudgetUsd: 10, budgetEmail: 'dev@example.com' };
test('SPOT-001-AC10: private S3, OAC and viewer access are attached to every request', () => {
  const template = Template.fromStack(new SpotDevStack(new App(), 'TestSpot', config));
  template.hasResourceProperties('AWS::S3::Bucket', { PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true }, VersioningConfiguration: { Status: 'Enabled' } });
  template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', { OriginAccessControlConfig: { SigningBehavior: 'always', SigningProtocol: 'sigv4', OriginAccessControlOriginType: 's3' } });
  template.hasResourceProperties('AWS::CloudFront::Distribution', { DistributionConfig: { DefaultRootObject: 'index.html', DefaultCacheBehavior: { ViewerProtocolPolicy: 'redirect-to-https', FunctionAssociations: [{ EventType: 'viewer-request', FunctionARN: Match.anyValue() }] }, CustomErrorResponses: Match.absent() } });
  template.hasResourceProperties('AWS::S3::BucketPolicy', { PolicyDocument: { Statement: Match.arrayWith([Match.objectLike({ Principal: { Service: 'cloudfront.amazonaws.com' }, Condition: { StringEquals: { 'AWS:SourceArn': Match.anyValue() } } })]) } });
  template.resourceCountIs('AWS::Lambda::Function', 0);
  template.resourceCountIs('AWS::Budgets::Budget', 1);
});
test('viewer function refuses unlisted IPv4/IPv6 and does not trust forwarded headers', () => {
  const handler = runInNewContext(viewerRequestCode(config.allowedIps) + '; handler') as (event: unknown) => { statusCode?: number; uri?: string };
  for (const uri of ['/', '/index.html', '/assets/app.js', '/missing']) {
    const allowed = handler({ viewer: { ip: config.allowedIps[0] }, request: { uri } }); assert.equal(allowed.uri, uri);
    assert.equal(handler({ viewer: { ip: '198.51.100.4' }, request: { uri, headers: { 'x-forwarded-for': { value: config.allowedIps[0] } } } }).statusCode, 403);
    assert.equal(handler({ viewer: { ip: '2001:db8::1' }, request: { uri } }).statusCode, 403);
  }
});
test('configuration fails closed for empty IPs, CIDRs and missing budget', () => {
  assert.deepEqual(validateConfig(config), config);
  for (const patch of [{ allowedIps: [] }, { allowedIps: ['0.0.0.0/0'] }, { monthlyBudgetUsd: 0 }, { budgetEmail: '' }, { region: 'us-east-1' }]) assert.throws(() => validateConfig({ ...config, ...patch }));
});
test('GitHub dev OIDC binds audience and environment; asset permissions exclude deletion', () => {
  const template = Template.fromStack(new SpotDevStack(new App(), 'TestOidc', { ...config, githubOidcProviderArn: `arn:aws:iam::${config.account}:oidc-provider/token.actions.githubusercontent.com` }));
  template.hasResourceProperties('AWS::IAM::Role', { AssumeRolePolicyDocument: { Statement: Match.arrayWith([Match.objectLike({ Action: 'sts:AssumeRoleWithWebIdentity', Condition: { StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com', 'token.actions.githubusercontent.com:sub': 'repo:Heroyuki/gto-analyzer:environment:dev' } } })]) } });
  const policies = JSON.stringify(template.findResources('AWS::IAM::Policy')); assert.ok(!policies.includes('s3:DeleteObject')); assert.ok(!policies.includes('AdministratorAccess'));
});
