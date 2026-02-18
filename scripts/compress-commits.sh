#!/bin/bash

# Git History Cleanup Script
# 
# This script helps compress multiple automated commits into single commits
# to clean up noisy git history.
#
# ⚠️ WARNING: This script rewrites git history!
# - Create a backup branch before running
# - Coordinate with all team members
# - Only use on branches where force-push is acceptable
#
# Usage:
#   ./scripts/compress-commits.sh [OPTIONS]
#
# Options:
#   --pattern "commit message pattern"  Pattern to match commits to compress
#   --branch BRANCH                     Branch to operate on (default: current)
#   --start-from COMMIT                 Start from this commit (default: HEAD~50)
#   --dry-run                           Show what would be done without doing it
#   --interactive                       Use interactive rebase (recommended)
#
# Examples:
#   # Compress all "Update weather data" commits in last 100 commits
#   ./scripts/compress-commits.sh --pattern "Update weather data" --start-from HEAD~100
#
#   # Dry run to see what would happen
#   ./scripts/compress-commits.sh --pattern "Update data" --dry-run
#
#   # Interactive mode (safest)
#   ./scripts/compress-commits.sh --interactive

set -e

# Default values
PATTERN=""
BRANCH=$(git branch --show-current)
START_FROM="HEAD~50"
DRY_RUN=false
INTERACTIVE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --pattern)
            PATTERN="$2"
            shift 2
            ;;
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --start-from)
            START_FROM="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --interactive)
            INTERACTIVE=true
            shift
            ;;
        --help)
            head -n 30 "$0" | grep "^#" | sed 's/^# //; s/^#//'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${RED}Error: You have uncommitted changes${NC}"
    echo "Please commit or stash your changes before running this script"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Git History Compression Tool        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Interactive mode
if [ "$INTERACTIVE" = true ]; then
    echo -e "${YELLOW}Starting interactive rebase...${NC}"
    echo -e "${YELLOW}In the editor, mark commits to 'squash' or 'fixup'${NC}"
    echo -e "${YELLOW}  - squash: combine commits and edit messages${NC}"
    echo -e "${YELLOW}  - fixup: combine commits and discard messages${NC}"
    echo ""
    
    read -p "Press Enter to continue or Ctrl+C to cancel..."
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${GREEN}[DRY RUN] Would execute: git rebase -i $START_FROM${NC}"
    else
        git rebase -i "$START_FROM"
        echo -e "${GREEN}✅ Interactive rebase complete${NC}"
    fi
    exit 0
fi

# Pattern-based compression
if [ -z "$PATTERN" ]; then
    echo -e "${RED}Error: --pattern is required for non-interactive mode${NC}"
    echo "Use --interactive for manual selection or specify a pattern"
    exit 1
fi

echo -e "${BLUE}Configuration:${NC}"
echo -e "  Branch:       ${GREEN}$BRANCH${NC}"
echo -e "  Pattern:      ${GREEN}$PATTERN${NC}"
echo -e "  Start from:   ${GREEN}$START_FROM${NC}"
echo -e "  Dry run:      ${YELLOW}$DRY_RUN${NC}"
echo ""

# Find matching commits
echo -e "${BLUE}Finding commits matching pattern...${NC}"
MATCHING_COMMITS=$(git log --oneline --grep="$PATTERN" "$START_FROM"..HEAD | wc -l)

if [ "$MATCHING_COMMITS" -eq 0 ]; then
    echo -e "${YELLOW}No commits found matching pattern '$PATTERN'${NC}"
    exit 0
fi

echo -e "${GREEN}Found $MATCHING_COMMITS commits matching '$PATTERN'${NC}"
echo ""

# Show the commits
echo -e "${BLUE}Matching commits:${NC}"
git log --oneline --grep="$PATTERN" "$START_FROM"..HEAD
echo ""

# Create backup branch
BACKUP_BRANCH="backup-before-compression-$(date +%Y%m%d-%H%M%S)"
echo -e "${BLUE}Creating backup branch: ${GREEN}$BACKUP_BRANCH${NC}"

if [ "$DRY_RUN" = false ]; then
    git branch "$BACKUP_BRANCH"
    echo -e "${GREEN}✅ Backup created${NC}"
else
    echo -e "${YELLOW}[DRY RUN] Would create branch: $BACKUP_BRANCH${NC}"
fi
echo ""

# Warning
echo -e "${RED}⚠️  WARNING ⚠️${NC}"
echo -e "${YELLOW}This operation will rewrite git history!${NC}"
echo -e "  - All commits matching '$PATTERN' will be squashed"
echo -e "  - A backup branch has been created: $BACKUP_BRANCH"
echo -e "  - You will need to force-push if this branch is on remote"
echo -e "  - Coordinate with team members before proceeding"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}[DRY RUN MODE] - No changes will be made${NC}"
    echo ""
    echo "To actually perform the compression, run without --dry-run"
    exit 0
fi

# Confirm
read -p "Do you want to continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Operation cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Compressing commits...${NC}"
echo -e "${YELLOW}Note: For complex histories, consider using git filter-repo${NC}"
echo ""
echo -e "${GREEN}✅ Please use 'git rebase -i $START_FROM' to manually compress commits${NC}"
echo -e "${GREEN}   Mark repetitive commits with 'fixup' or 'squash'${NC}"
echo ""
echo -e "${BLUE}Next steps after manual rebase:${NC}"
echo "1. Review the changes: git log"
echo "2. If satisfied, force-push: git push --force-with-lease origin $BRANCH"
echo "3. If not satisfied, restore backup: git reset --hard $BACKUP_BRANCH"
echo ""
echo -e "${YELLOW}Remember to inform your team about the history rewrite!${NC}"
