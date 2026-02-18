# GitHub Actions Workflow Best Practices

## Preventing Noisy Git History from Automated Commits

This document provides guidelines for workflows that need to commit data automatically without polluting the git history.

### Problem

Automated workflows that fetch and commit data frequently (e.g., weather data, API responses, metrics) can create hundreds of noisy commits like:
```
Update weather data
Update weather data  
Update weather data
...
```

This makes git history difficult to navigate and review.

### Solutions

#### 1. Batch Commits with Squash Strategy

Instead of committing on every run, batch multiple updates and squash them:

```yaml
name: Update Data (Batched)
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours instead of every hour

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history for squashing
      
      - name: Fetch and update data
        run: |
          # Your data fetching logic here
          curl -o data/weather.json https://api.example.com/weather
      
      - name: Commit with [skip ci] to prevent recursion
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/
          git diff --staged --quiet || git commit -m "chore: update data [skip ci]"
          git push
```

#### 2. Use a Separate Data Branch

Keep automated data commits separate from main development:

```yaml
name: Update Data (Separate Branch)
on:
  schedule:
    - cron: '0 * * * *'

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: data-updates  # Dedicated branch for data
      
      - name: Fetch data
        run: ./scripts/fetch_data.sh
      
      - name: Commit to data branch
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/
          git diff --staged --quiet || git commit -m "Update data $(date -u +%Y-%m-%dT%H:%M:%SZ)"
          git push origin data-updates
```

Users can merge from `data-updates` to `main` periodically with a single squashed commit.

#### 3. Use Git LFS for Large Data Files

For frequently-updated large files:

```yaml
name: Update Data (Git LFS)
on:
  schedule:
    - cron: '0 */12 * * *'

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Git LFS
        run: git lfs install
      
      - name: Track data files with LFS
        run: |
          git lfs track "data/*.json"
          git add .gitattributes
      
      - name: Update and commit
        run: |
          ./scripts/fetch_data.sh
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/
          git diff --staged --quiet || git commit -m "Update data files"
          git push
```

Git LFS stores file contents separately, reducing repository bloat.

#### 4. Store Data in External Storage (Recommended)

The best approach: **don't commit data files at all**. Store them externally:

```yaml
name: Update Data (External Storage)
on:
  schedule:
    - cron: '0 * * * *'

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch and upload data
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          # Fetch data
          curl -o weather.json https://api.example.com/weather
          
          # Upload to S3/CDN/GitHub Releases
          aws s3 cp weather.json s3://your-bucket/data/weather.json --acl public-read
          
          # Or upload as a release asset
          # Or upload to GitHub Pages
          # Or use any other storage solution
```

Then reference the external URL in your application:
```javascript
const data = await fetch('https://your-cdn.com/data/weather.json')
```

#### 5. Compress Existing Noisy Commits

If you already have noisy commit history, you can clean it up:

```bash
# Create a backup branch first
git checkout -b backup-before-squash

# Interactive rebase to squash commits
git checkout main
git rebase -i HEAD~100  # Adjust number as needed

# In the editor, mark commits to squash:
# pick abc1234 First commit
# squash def5678 Update weather data
# squash ghi9012 Update weather data
# squash jkl3456 Update weather data
# ...

# Force push (⚠️ only if you're sure and have coordinated with team)
git push --force-with-lease origin main
```

**⚠️ Warning**: Force pushing rewrites history. Only do this if:
- You've coordinated with all collaborators
- No one else has branches based on these commits
- You have a backup

### Recommendations

1. **For static data that rarely changes**: Commit directly to main
2. **For data that updates hourly/daily**: Use external storage (S3, CDN, GitHub Releases)
3. **For data that needs version control**: Use a separate branch and merge periodically
4. **For large binary files**: Use Git LFS
5. **Always use `[skip ci]` in commit messages** to prevent infinite workflow loops

### TPEN-Specific Guidance

Currently, TPEN-interfaces has no automated data commit workflows. If you need to add one:

- **Preferred**: Store data externally (S3, RERUM, or CDN)
- **Alternative**: Use a dedicated `data` branch separate from `main`
- **Avoid**: Committing to `main` on every workflow run

### Related Resources

- [GitHub Actions: Preventing workflow runs](https://docs.github.com/en/actions/managing-workflow-runs/skipping-workflow-runs)
- [Git LFS Documentation](https://git-lfs.github.com/)
- [Git Rebase Interactive](https://git-scm.com/docs/git-rebase#_interactive_mode)
