---
title: Assuming IAM role and role chaining in AWS
tags:
  - today-i-learned
  - aws
  - nodejs
date: '2022-11-13T21:14:26.917Z'
slug: assuming-iam-role-and-role-chaining-in-aws
draft: false
summary: >-
  AWS Security Token Service allows applications to assume cross-account roles
  using temporary credentials. However, when an IAM role assumes another role,
  the process is considered role chaining and enforces a strict one-hour session
  duration limit.
---

Sometimes a user or an application needs to access resources they don’t normally have access to. This is where the AWS Security Token Service (STS) comes in handy. STS is an AWS service used to obtain temporary security credentials for IAM users or roles by using the `AssumeRole` action. This is useful in situations like:

-   **cross-account access** - when a user or an application needs to access a resource or a service in another AWS account

-   **user federation** - users might be authenticated via SSO (single sign-on) or OpenID and this grants them access to the AWS account without needing to create an explicit AWS account.

-   **provide permissions to software running on EC2 instances or in Lambda functions** - EC2 instance or the Lambda function assumes the role and provides temporary credentials for the app running on it

In order to be able to assume a role, the role has to be configured to allow that. Specifically, it needs to have a ************************trust policy************************ defined. It can look something like this.

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111122223333:root"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Moreover, you can define for how long the role is valid (as the assumed role has temporary credentials that expire). By default, the expiration is set to 1 hour, but it can be increased up to 12 hours (the parameter _Maximum session duration_ in the AWS console must be updated to allow that).

Now when the role is configured, we can assume it programmatically.

```
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts'

const stsClient = new STSClient({
  apiVersion: '2012-08-10',
  region: 'us-east-1',
})

const assumedRole = await stsClient.send(
  new AssumeRoleCommand({
    RoleArn: 'arn:aws:iam::OTHER_ACCOUNT_ID:role/ROLE_NAME',
    RoleSessionName: 'my-temporary-role',
    DurationSeconds: 12 * 60 * 60, // 12 hours
  }),
)

// When the request succeeds, we get the credentials in the response
// which can be used to authenticate with another AWS service.
// Notice that you have to provide `SessionToken` as well
//
// assumedRole.Credentials.AccessKeyId
// assumedRole.Credentials.SecretAccessKey
// assumedRole.Credentials.SessionToken
```

## How we use it

We have an application leveraging two AWS accounts - one for the API and one for the data science (DS) stuff. The API needs to connect to the OpenSearch service that is in the DS organization.

Therefore, we needed to configure an IAM role in the DS organization, that would allow connecting to OpenSearch while also allowing it to be assumed from our primary AWS organization via the above-mentioned trust policy.

Then, when the app starts, we call the STS service to assume the cross-account role and retrieve the temporary credentials. After that, the OpenSearch client can be initialized with the temporary credentials from the STS and the app can use it seamlessly.

This seemed good in theory and worked great in practice as well. Locally (**!**)

## ********************************************************The problem and the solution********************************************************

Once tested and verified to work, the code got merged and deployed to our development environment. Or I should say it tried to get deployed. We noticed that suddenly, the deployment CI/CD pipeline was failing for some unknown reason.

When we started debugging we noticed that the [Fargate](https://aws.amazon.com/fargate/) couldn’t spin up a container as it kept failing. After checking the application logs we stumbled upon this error.

```
The requested DurationSeconds exceeds the 1-hour session limit for roles assumed by role chaining
```

What the heck is the ****************************role chaining**************************** and why is there a 1-hour session limit if we specifically set 12 hours?

If you put this error message in Google you’ll probably get [this article from AWS support](https://aws.amazon.com/premiumsupport/knowledge-center/iam-role-chaining-limit/) as the first result. After reading through it we got to this statement

> _Role chaining is when you use_ **_a role to assume a second role_** _through the AWS CLI or API._

As we’re deploying our API to Fargate, it already has an assigned execution role for it to work properly so when it tries to assume another role from the code it’s being considered a role chaining.

> **_Role chaining_** _limits your AWS CLI or AWS API role session to a_ **_maximum of one hour._** _However, if you assume a role using role chaining and provide a_ _`DurationSeconds`__parameter value greater than one hour, the operation fails._

As explained in the docs, sessions created by role chaining are limited to a one-hour session duration.

How come it worked locally then? Easy, on our local computers, we use our personal user’s credentials, therefore the role-chaining doesn’t happen there, and thus the 12 hours expiration limit is perfectly legit.

## Conclusion or TL;DR

If you create a role in AWS and use STS `assumeRole` to get temporary credentials for another role, the max expiration is 1 hour.

The docs mention a `SessionDuration` parameter that allows setting expiration up to 12 hours but only when an **IAM** **user** assumes the specified role.

If role A is assuming role B this is called [**role chaining**](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html#iam-term-role-chaining) and then the max 1-hour limit applies.
