#!/bin/bash
# Grafana Dashboard Backup Script
# Exports all dashboards via Grafana API and commits to Git repository

set -euo pipefail

# Configuration from environment variables
GRAFANA_URL="${GRAFANA_URL:-http://grafana.observability.svc.cluster.local:3000}"
GRAFANA_API_KEY="${GRAFANA_API_KEY:-}"
GIT_REPO_URL="${GIT_REPO_URL:-}"
GIT_BRANCH="${GIT_BRANCH:-main}"
GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-Grafana Backup Bot}"
GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-grafana-backup@health-tracker.local}"
DASHBOARD_DIR="${DASHBOARD_DIR:-.github/dashboards}"
SSH_KEY_PATH="${SSH_KEY_PATH:-/secrets/ssh/id_rsa}"

# Logging functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

# Validate configuration
validate_config() {
    log "Validating configuration..."

    if [ -z "$GRAFANA_API_KEY" ]; then
        error "GRAFANA_API_KEY is required"
        return 1
    fi

    if [ -z "$GIT_REPO_URL" ]; then
        error "GIT_REPO_URL is required"
        return 1
    fi

    log "Configuration validated"
}

# Setup Git configuration
setup_git() {
    log "Setting up Git configuration..."

    # Configure Git user
    git config --global user.name "$GIT_AUTHOR_NAME"
    git config --global user.email "$GIT_AUTHOR_EMAIL"

    # Setup SSH if using SSH URL
    if [[ "$GIT_REPO_URL" == git@* ]] || [[ "$GIT_REPO_URL" == ssh://* ]]; then
        if [ ! -f "$SSH_KEY_PATH" ]; then
            error "SSH key not found at $SSH_KEY_PATH"
            return 1
        fi

        mkdir -p ~/.ssh
        chmod 700 ~/.ssh
        cp "$SSH_KEY_PATH" ~/.ssh/id_rsa
        chmod 600 ~/.ssh/id_rsa

        # Disable strict host key checking for automated backups
        cat > ~/.ssh/config <<EOF
Host *
    StrictHostKeyChecking no
    UserKnownHostsFile=/dev/null
EOF
        chmod 600 ~/.ssh/config

        log "SSH configured"
    fi

    log "Git configuration complete"
}

# Clone or update repository
clone_repository() {
    log "Cloning repository: $GIT_REPO_URL"

    if [ -d "/workspace/repo/.git" ]; then
        log "Repository already exists, updating..."
        cd /workspace/repo
        git fetch origin "$GIT_BRANCH"
        git checkout "$GIT_BRANCH"
        git pull origin "$GIT_BRANCH"
    else
        git clone --depth 1 --branch "$GIT_BRANCH" "$GIT_REPO_URL" /workspace/repo
        cd /workspace/repo
    fi

    log "Repository ready"
}

# Get list of all dashboards from Grafana
get_dashboards() {
    log "Fetching dashboard list from Grafana..."

    local response
    response=$(curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
        "${GRAFANA_URL}/api/search?type=dash-db")

    if [ $? -ne 0 ]; then
        error "Failed to fetch dashboard list"
        return 1
    fi

    local dashboard_count
    dashboard_count=$(echo "$response" | jq '. | length')

    log "Found $dashboard_count dashboard(s)"
    echo "$response"
}

# Export single dashboard
export_dashboard() {
    local uid=$1
    local title=$2

    log "Exporting dashboard: $title (uid: $uid)"

    local response
    response=$(curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
        "${GRAFANA_URL}/api/dashboards/uid/${uid}")

    if [ $? -ne 0 ]; then
        error "Failed to export dashboard $uid"
        return 1
    fi

    # Extract dashboard JSON (remove meta wrapper)
    local dashboard_json
    dashboard_json=$(echo "$response" | jq '.dashboard')

    if [ "$dashboard_json" = "null" ] || [ -z "$dashboard_json" ]; then
        error "Invalid dashboard JSON for $uid"
        return 1
    fi

    # Sanitize title for filename
    local filename
    filename=$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
    filename="${filename}.json"

    # Save dashboard to file
    echo "$dashboard_json" | jq '.' > "/workspace/repo/${DASHBOARD_DIR}/${filename}"

    log "Dashboard exported: $filename"
}

# Export all dashboards
export_all_dashboards() {
    log "Starting dashboard export..."

    # Create dashboard directory if it doesn't exist
    mkdir -p "/workspace/repo/${DASHBOARD_DIR}"

    # Get dashboard list
    local dashboards
    dashboards=$(get_dashboards)

    if [ -z "$dashboards" ] || [ "$dashboards" = "[]" ]; then
        log "No dashboards to export"
        return 0
    fi

    # Export each dashboard
    local count=0
    while IFS= read -r dashboard; do
        local uid
        local title

        uid=$(echo "$dashboard" | jq -r '.uid')
        title=$(echo "$dashboard" | jq -r '.title')

        if [ "$uid" != "null" ] && [ -n "$uid" ]; then
            export_dashboard "$uid" "$title"
            count=$((count + 1))
        fi
    done < <(echo "$dashboards" | jq -c '.[]')

    log "Exported $count dashboard(s)"
}

# Create Git commit if changes detected
commit_changes() {
    log "Checking for changes..."

    cd /workspace/repo

    # Check if there are changes
    if git diff --quiet && git diff --cached --quiet; then
        log "No changes detected, skipping commit"
        return 0
    fi

    # Stage all dashboard changes
    git add "$DASHBOARD_DIR/"

    # Create commit message with timestamp and dashboard count
    local dashboard_count
    dashboard_count=$(find "$DASHBOARD_DIR" -name "*.json" -type f | wc -l | tr -d ' ')

    local commit_message
    commit_message="chore(dashboards): automated Grafana dashboard backup

Backed up $dashboard_count dashboard(s) from Grafana

Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Grafana URL: $GRAFANA_URL

🤖 Generated by Grafana Backup Bot"

    git commit -m "$commit_message"

    log "Changes committed"
}

# Push changes to remote
push_changes() {
    log "Pushing changes to remote..."

    cd /workspace/repo

    # Check if there are commits to push
    if git diff --quiet origin/"$GIT_BRANCH" "$GIT_BRANCH"; then
        log "No commits to push"
        return 0
    fi

    # Push to remote
    if git push origin "$GIT_BRANCH"; then
        log "Changes pushed successfully"
    else
        error "Failed to push changes"
        return 1
    fi
}

# Export datasource configuration
export_datasources() {
    log "Exporting datasource configuration..."

    mkdir -p "/workspace/repo/${DASHBOARD_DIR}/provisioning"

    local response
    response=$(curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
        "${GRAFANA_URL}/api/datasources")

    if [ $? -ne 0 ]; then
        error "Failed to fetch datasources"
        return 1
    fi

    # Create datasources.yml for provisioning
    cat > "/workspace/repo/${DASHBOARD_DIR}/provisioning/datasources.yml" <<'EOF'
# Grafana Datasource Configuration
# Auto-generated by Grafana Backup Bot
apiVersion: 1

datasources:
EOF

    # Parse and add each datasource
    local datasource_count
    datasource_count=$(echo "$response" | jq '. | length')

    if [ "$datasource_count" -gt 0 ]; then
        while IFS= read -r datasource; do
            local name
            local type
            local url
            local access

            name=$(echo "$datasource" | jq -r '.name')
            type=$(echo "$datasource" | jq -r '.type')
            url=$(echo "$datasource" | jq -r '.url')
            access=$(echo "$datasource" | jq -r '.access')

            cat >> "/workspace/repo/${DASHBOARD_DIR}/provisioning/datasources.yml" <<EOF
  - name: $name
    type: $type
    access: $access
    url: $url
    isDefault: $(echo "$datasource" | jq -r '.isDefault')
    editable: true
EOF
        done < <(echo "$response" | jq -c '.[]')

        log "Exported $datasource_count datasource(s)"
    else
        log "No datasources to export"
    fi
}

# Create backup metadata
create_metadata() {
    log "Creating backup metadata..."

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local dashboard_count
    dashboard_count=$(find "/workspace/repo/${DASHBOARD_DIR}" -name "*.json" -type f | wc -l | tr -d ' ')

    cat > "/workspace/repo/${DASHBOARD_DIR}/backup-metadata.json" <<EOF
{
  "timestamp": "$timestamp",
  "grafana_url": "$GRAFANA_URL",
  "dashboard_count": $dashboard_count,
  "backup_version": "1.0.0",
  "git_branch": "$GIT_BRANCH"
}
EOF

    log "Metadata created"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."

    # Remove SSH keys from memory
    rm -f ~/.ssh/id_rsa 2>/dev/null || true
    rm -rf ~/.ssh 2>/dev/null || true

    log "Cleanup complete"
}

# Main backup workflow
main() {
    log "=== Grafana Dashboard Backup Started ==="
    log "Grafana URL: $GRAFANA_URL"
    log "Git Repository: $GIT_REPO_URL"
    log "Git Branch: $GIT_BRANCH"
    log "Dashboard Directory: $DASHBOARD_DIR"

    # Set trap for cleanup
    trap cleanup EXIT

    # Step 1: Validate configuration
    validate_config
    if [ $? -ne 0 ]; then
        error "Configuration validation failed"
        exit 1
    fi

    # Step 2: Setup Git
    setup_git
    if [ $? -ne 0 ]; then
        error "Git setup failed"
        exit 1
    fi

    # Step 3: Clone repository
    clone_repository
    if [ $? -ne 0 ]; then
        error "Repository clone failed"
        exit 1
    fi

    # Step 4: Export dashboards
    export_all_dashboards
    if [ $? -ne 0 ]; then
        error "Dashboard export failed"
        exit 1
    fi

    # Step 5: Export datasources
    export_datasources

    # Step 6: Create metadata
    create_metadata

    # Step 7: Commit changes
    commit_changes
    if [ $? -ne 0 ]; then
        error "Git commit failed"
        exit 1
    fi

    # Step 8: Push changes
    push_changes
    if [ $? -ne 0 ]; then
        error "Git push failed"
        exit 1
    fi

    log "=== Grafana Dashboard Backup Completed Successfully ==="
    exit 0
}

# Run main function
main "$@"
