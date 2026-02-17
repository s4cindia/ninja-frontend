# Ninja Frontend - Commit History

## Branch: feat/citation-ui-enhancements

This document tracks all commits for reference and restore points.

---

## Recent Commits

| Commit Hash | Date & Time | Description |
|-------------|-------------|-------------|
| `2d30945` | 2026-02-17 20:45:00 | **feat(citation): enhance citation editor with clickable links and track changes** |
| `ca1762d` | 2026-02-15 | fix: improve orphan citation detection and highlighting |
| `350f392` | 2026-02-14 | feat(citation): enhance UI with dynamic progress, manuscript viewer, and export options |
| `bd19469` | 2026-02-10 | Improve citation display by rendering HTML from multiple fields |
| `3c61d7e` | 2026-02-10 | Fix citation highlights not rendering as HTML |
| `bf0742d` | 2026-02-07 | Improve citation highlighting and display in the document editor |
| `8b3eda3` | 2026-02-07 | Improve citation highlighting accuracy and visibility in the editor |
| `bd8af05` | 2026-02-07 | Improve citation validation and add interactive highlighting |
| `809d99c` | 2026-02-07 | Add citation validation and reference lookup functionality |
| `e275a7f` | 2026-02-07 | Add ability to regenerate HTML content for documents |
| `c28cc53` | 2026-02-06 | Add a citation editor to view and modify document text |
| `d49b9c1` | 2026-02-06 | Improve citation analysis with automatic stylesheet detection |

---

## Key Restore Points

### Clickable Citations and Track Changes
- **Commit:** `2d30945`
- **Date:** 2026-02-17 20:45:00
- **Description:** Major enhancement to citation editor UI
- **Key Changes:**
  - Clickable citation numbers that scroll to corresponding reference
  - Citation range expansion ([3-5] displays as clickable [3, 4, 5])
  - APA author-year citation matching and linking
  - Track change colors (green=additions, red=deletions, blue=renumber)
  - Orphaned citation detection with visual warnings
  - Tab navigation between document preview and reference list
  - "Fix Sequence" button for Vancouver-style resequencing
  - New ReferenceEditor component with drag-drop reordering
  - New DragDropGuide component for user guidance
  - Export options modal with track changes support

### Orphan Citation Detection
- **Commit:** `ca1762d`
- **Date:** 2026-02-15
- **Description:** Improved detection and highlighting of orphaned citations
- **Key Changes:**
  - Better detection of citations pointing to deleted references
  - Visual warning indicators for orphaned citations
  - Integration with track changes display

### Dynamic Progress UI
- **Commit:** `350f392`
- **Date:** 2026-02-14
- **Description:** Enhanced UI with progress indicators and export options
- **Key Changes:**
  - Dynamic progress tracking during document processing
  - Manuscript viewer component
  - Export options modal

---

## Component Reference

### Citation Components (`src/components/citation/`)

| Component | Description |
|-----------|-------------|
| `DocumentViewer.tsx` | Displays document with highlighted citations, clickable links, track changes |
| `ReferenceEditor.tsx` | Drag-drop reference list editor with delete functionality |
| `DragDropGuide.tsx` | Modal guide explaining drag-drop reordering |
| `ExportOptionsModal.tsx` | Export options (track changes vs accepted changes) |

### Pages (`src/pages/`)

| Page | Description |
|------|-------------|
| `CitationEditorPage.tsx` | Main citation editor with tabs, resequencing, export |
| `CitationAnalysisPage.tsx` | Citation analysis results display |
| `CitationUploadPage.tsx` | Document upload for citation processing |

### Styles (`src/styles/index.css`)

Track change CSS classes:
- `.track-change-addition` - Green background for additions
- `.track-change-deletion` - Red background with strikethrough for deletions
- `.track-change-renumber` - Blue background for renumbered citations
- `.highlight-flash` - Animation for scrolled-to references
- `.citation-link` - Clickable citation number styling

---

## How to Restore

```bash
# View commit details
git show <commit-hash>

# Restore to a specific commit (keeps history)
git checkout <commit-hash>

# Hard reset to a commit (discards all changes after)
git reset --hard <commit-hash>

# Create a branch from a restore point
git checkout -b restore-branch <commit-hash>
```

---

## Quick Reference Commands

```bash
# View full commit history
git log --oneline

# View commit with changes
git show <commit-hash> --stat

# Compare two commits
git diff <commit1> <commit2>

# Find commits by message
git log --grep="citation"
```

---

*Last Updated: 2026-02-17 20:45:00*
