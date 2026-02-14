# Setup

## Setup Amazon access

### Setup AWS

- Sign-in to AWS and go to Account.
- Go to IAM (dashboard).
- Create a user or identify an existing user.
- Assign the user properties to query Bedrock:
  - AmazonBedrockFullAccess


### Setup locally

- On the machine to run, setup the AWS CLI.
- Run aws configure and enter the security credentials details from setting up
  the user in AWS.
- You can now run IntentCode with Nova 2 models.


### Model catalog

Currently (Feb 2026) the Nova 2 models are available in us-east-1 (not us-west-x).

https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/model-catalog?region=us-east-1&deploymentType=Serverless&providerName=amazon


### Check for access to models

This command looks for models containing nova-2:

```sh
aws bedrock list-foundation-models --query "modelSummaries[?contains(modelId,'nova-2')]" --region us-east-1
```


Look at cross-inference models:

```sh
aws bedrock list-inference-profiles --region us-east-1
```

It looks like the Nova 1 Pro model was updated in-place with the Nova 2 Pro
weights (see the updatedAt, inline when Nova 2 Pro was released):

```json
{ "inferenceProfileName": "US Nova Pro", "description": "Routes requests to Nova Pro in us-east-1, us-west-2 and us-east-2.", "createdAt": "2024-11-29T13:23:00+00:00", "updatedAt": "2025-11-12T17:44:56.051286+00:00", "inferenceProfileArn": "arn:aws:bedrock:us-east-1:367326165475:inference-profile/us.amazon.nova-pro-v1:0", "models": [ { "modelArn": "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0" }, { "modelArn": "arn:aws:bedrock:us-west-2::foundation-model/amazon.nova-pro-v1:0" }, { "modelArn": "arn:aws:bedrock:us-east-2::foundation-model/amazon.nova-pro-v1:0" } ], "inferenceProfileId": "us.amazon.nova-pro-v1:0", "status": "ACTIVE", "type": "SYSTEM_DEFINED" },
```


## Run the IntentCode engine

To run: `npm run ic`
Or to run with dev checks (slower): `npm run ic-dev`


## Setup AI

In the main menu select k <enter> to setup your AI keys.
Return to the main menu and select m <enter> to select your model presets.

