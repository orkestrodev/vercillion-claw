# Production Dockerfile optimized for Hugging Face Spaces Docker SDK
# Compatible with Node >= 22.13.0 and Playwright Chromium
FROM node:22-bookworm

# Non-interactive apt installation
ENV DEBIAN_FRONTEND=noninteractive

# Install essential utilities for sandboxed shell execution (git, curl, jq)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces enforces running as user ID 1000.
# Ensure a non-root user with UID 1000 exists and has a configured home directory.
RUN if id -u 1000 >/dev/null 2>&1; then \
        EXISTING_USER=$(id -nu 1000); \
        if [ "$EXISTING_USER" != "user" ]; then \
            usermod -l user -d /home/user -m "$EXISTING_USER" 2>/dev/null || true; \
            groupmod -n user "$EXISTING_USER" 2>/dev/null || true; \
        fi; \
    else \
        useradd -m -u 1000 -s /bin/bash user; \
    fi

# Configure environment variables
ENV HOME=/home/user \
    APP_DIR=/home/user/app \
    PATH=/home/user/.local/bin:$PATH \
    PLAYWRIGHT_BROWSERS_PATH=/home/user/.cache/ms-playwright \
    PORT=8080 \
    MASTRA_HOST=0.0.0.0 \
    NODE_ENV=production \
    TURSO_DATABASE_URL=file:/home/user/app/mastra.db \
    CLAW_WORKSPACE_DIR=/home/user/app/workspace

WORKDIR ${APP_DIR}

# Pre-create necessary workspace and cache directories with UID 1000 ownership
RUN mkdir -p ${APP_DIR}/workspace/personas \
             ${APP_DIR}/workspace/skills \
             ${APP_DIR}/workspace/artifacts \
             ${APP_DIR}/workspace/scripts \
             /home/user/.cache/ms-playwright \
    && chown -R 1000:1000 /home/user

# Install package dependencies (including devDependencies required for mastra build)
COPY --chown=1000:1000 package*.json ./
RUN npm ci --include=dev

# Install Playwright Chromium binary along with all Linux OS dependencies
RUN npx playwright install --with-deps chromium

# Copy remaining application source code
COPY --chown=1000:1000 . .

# Build the Mastra application (outputs production artifacts to .mastra/output)
RUN npm run build

# Ensure all application and workspace files belong to user 1000
RUN chown -R 1000:1000 /home/user

# Switch to non-root user (UID 1000) for security and Hugging Face Spaces compatibility
USER 1000

# Expose default Cloud Run / container port
EXPOSE 8080

# Start Mastra server
CMD ["npm", "run", "start"]
