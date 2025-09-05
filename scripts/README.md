# Scripts Directory Documentation

## Active Scripts (Production Ready)

### Integration Scripts
- **integrate-transcripts-corrected.js** - Final working transcript integration script
  - Uses correct database schema
  - Handles both transcripts and segments
  - Includes proper error handling

### Database Scripts
- **check-database-schema.js** - Validates database schema
- **test-db-connection.js** - Tests database connectivity
- **quick-schema-check.js** - Quick schema validation utility

### Data Collection Scripts
- **get-all-huberman-videos.js** - Fetches all Huberman Lab video metadata
- **final-transcript-downloader.js** - Downloads transcripts from YouTube

### Verification Scripts
- **verify-integration-success.js** - Verifies transcript integration success
- **test-complete-system.js** - End-to-end system testing

## Archived Scripts

All duplicate, outdated, or experimental scripts have been moved to `./archive/` directory.
These are kept for reference but should not be used in production.

## Usage Instructions

### To integrate transcripts:
```bash
node scripts/integrate-transcripts-corrected.js
```

### To verify integration:
```bash
node scripts/verify-integration-success.js
```

### To test the complete system:
```bash
node scripts/test-complete-system.js
```

## Maintenance

- Keep only essential scripts in the main directory
- Archive experimental or duplicate scripts
- Update this documentation when adding new scripts
- Test all scripts before deployment

Generated on: 2025-09-05T21:10:09.329Z
