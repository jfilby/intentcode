# Data setup

## Login as admin user

Login using your preferred method before running setup. This is because the
first login method is difficult to change.


## Run setup

This will apply the currently selected LLMs (their Tech records) to the active
Analysis records.

npm run ts-script setup


## Setup Serene AI tech provider keys

Run this command, you will be prompted for the locations of the AI tech
provider API keys in JSON format.

npm run ts-script load-tech-provider-api-keys

The format of the file is as follows:

```json
[
  {
    "techProviderName": "Google Gemini",
    "status": "A",
    "name": "..",
    "accountEmail": "..",
    "apiKey": "..",
    "pricingTier": "free"
  }
]
```

- Name should be short but descriptive of the API key.
- Pricing tier can be "free" or "paid".

