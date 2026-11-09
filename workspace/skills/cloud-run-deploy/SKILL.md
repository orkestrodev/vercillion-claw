---
name: cloud-run-deploy
description: Deploy Docker containers and source applications to Google Cloud Run using gcloud or Cloud Run MCP tools.
version: 1
metadata:
  tags: [deploy, google-cloud, cloud-run, docker, containers]
---

# Skill: Deploy Docker Containers to Google Cloud Run

## Context & Constraints
- Target platform: Google Cloud Run (Fully Managed serverless).
- Default runtime port: 8080 (unless overridden by the `--port` flag or container configuration).
- Prefer the official Cloud Run MCP tools when available. If not available, fall back to the `gcloud` CLI.

## Pre-deployment Checklist
1. Authenticate using `gcloud auth login` and `gcloud auth configure-docker`.
2. Set active target project: `gcloud config set project [PROJECT_ID]`.
3. Ensure the Artifact Registry repository exists.

## Execution Pathways

### Pathway A: Single Container Deployment (Standard)
Execute the direct deploy command using a pre-built image URI:
```bash
gcloud run deploy [SERVICE_NAME] --image=[ARTIFACT_REGISTRY_IMAGE_URL] --region=[REGION] --allow-unauthenticated
```

### Pathway B: Multi-Container Setup (Docker Compose / Sidecars)
If a user provides a `compose.yaml` file, utilize the native Compose specification deployment:
```bash
gcloud run compose up compose.yaml
```

### Pathway C: Source-to-Container (No Pre-built Image)
If only raw source code and a Dockerfile are present, let Cloud Build build it automatically on the fly:
```bash
gcloud run deploy [SERVICE_NAME] \
  --source . \
  --region=[REGION] \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --set-env-vars="PORT=8080,MASTRA_HOST=0.0.0.0,OPENAI_BASE_URL=https://apimaster.ai/v1,DEFAULT_MODEL=gpt-6-luna" \
  --set-secrets="OPENAI_API_KEY=OPENAI_API_KEY:latest"
```

## Expected Output
Extract and return the stable public endpoint service URL provided at the end of the deployment sequence.
