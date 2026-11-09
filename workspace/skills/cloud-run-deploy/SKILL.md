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
4. If using Secret Manager, grant the default Compute service account the `Secret Manager Secret Accessor` role:
   ```bash
   PROJECT_NUMBER=$(gcloud projects describe [PROJECT_ID] --format='value(projectNumber)')
   gcloud projects add-iam-policy-binding [PROJECT_ID] \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

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
If only raw source code and a Dockerfile are present, let Cloud Build build it automatically on the fly with production optimizations:
```bash
gcloud run deploy [SERVICE_NAME] \
  --source . \
  --region=[REGION] \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300s \
  --concurrency=10 \
  --max-instances=3 \
  --no-cpu-throttling \
  --set-env-vars="PORT=8080,MASTRA_HOST=0.0.0.0,NODE_ENV=production,OPENAI_BASE_URL=https://apimaster.ai/v1,DEFAULT_MODEL=gpt-6-luna,TURSO_DATABASE_URL=libsql://vextral-vextralai.aws-eu-central-1.turso.io" \
  --set-secrets="OPENAI_API_KEY=OPENAI_API_KEY:latest,TURSO_AUTH_TOKEN=TURSO_AUTH_TOKEN:latest"
```

## Expected Output
Extract and return the stable public endpoint service URL provided at the end of the deployment sequence.
