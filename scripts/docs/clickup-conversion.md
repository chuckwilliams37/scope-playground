# ClickUp CSV to Scope Playground JSON Converter

This script converts ClickUp CSV exports into JSON format compatible with the Scope Playground ImportStoriesPanel component.

## Usage

```bash
python3 scripts/convert_clickup_csv_to_json.py <csv_file_path> [output_json_path]
```

### Arguments

- `csv_file_path` (required): Path to the ClickUp CSV export file
- `output_json_path` (optional): Path for the output JSON file. If not provided, generates a timestamped filename.

### Example

```bash
python3 scripts/convert_clickup_csv_to_json.py \
  "data/2025-10-15T17_52_34.539Z The Agency Project V 0 1 - Ready Roofer - RR Dev Projects - RR Warrantee Special Projects.csv" \
  "data/readyroofer_warrantee_stories.json"
```

## Conversion Mapping

The script maps ClickUp fields to Scope Playground fields as follows:

### Business Value Mapping

| ClickUp Priority | Scope Playground Business Value |
|-----------------|--------------------------------|
| HIGH, URGENT    | Critical                       |
| NORMAL, MEDIUM  | Important                      |
| LOW, none       | Nice to Have                   |

### Effort Estimation

| ClickUp Status  | Scope Playground Effort |
|----------------|------------------------|
| captured       | Low                    |
| defined        | Medium                 |
| in progress    | High                   |
| complete       | Low                    |

### Story Points Estimation

The script estimates story points using the following priority:

1. **Story Points field** - If available, uses the value directly
2. **Time Estimate** - Converts hours to points (1 point ≈ 3 hours)
3. **Subtask Count** - Uses number of subtasks as proxy
4. **Default** - Falls back to 3 points

### Field Mappings

| ClickUp Field          | Scope Playground Field | Notes                                    |
|-----------------------|------------------------|------------------------------------------|
| Task ID               | id                     | Prefixed with "rr-"                      |
| Task Name             | title                  | Direct mapping                           |
| Task Content          | userStory              | Direct mapping                           |
| Priority              | businessValue          | Mapped using priority table              |
| Status                | position.effort        | Mapped using status table                |
| Story Points (number) | points                 | Used in estimation algorithm             |
| Time Estimate (hours) | points                 | Converted to points if Story Points empty|
| tags                  | category               | First tag capitalized as category        |
| Subtask ID's          | acceptanceCriteria     | Subtasks become acceptance criteria      |

## Output Format

The script generates a JSON file with the following structure:

```json
{
  "stories": [
    {
      "id": "rr-86ac1zncm",
      "title": "Story Title",
      "userStory": "As a user, I want...",
      "points": 5,
      "businessValue": "Critical",
      "category": "Feature",
      "position": {
        "value": "Critical",
        "effort": "Medium",
        "rank": 1
      },
      "acceptanceCriteria": [
        "Criteria 1",
        "Criteria 2"
      ],
      "notes": "Imported from ClickUp. Original ID: 86ac1zncm, Status: defined",
      "isPublic": true,
      "sharedWithClients": []
    }
  ],
  "metadata": {
    "source": "ClickUp CSV Export",
    "importDate": "2025-10-15T12:57:34.656850",
    "totalStories": 13
  }
}
```

## Features

- **Automatic Priority Mapping**: Converts ClickUp priorities to business value categories
- **Smart Point Estimation**: Uses multiple data sources to estimate story points
- **Category Extraction**: Derives categories from ClickUp tags
- **Nested Subtask Flattening**: Recursively flattens multi-level subtask hierarchies
- **Acceptance Criteria**: Extracts criteria from task content and all nested subtasks
- **Metadata Tracking**: Preserves original ClickUp IDs and status in notes
- **Summary Report**: Displays conversion statistics by business value and category

### Nested Subtask Flattening

The script automatically handles multiple layers of nested subtasks:

```
Parent Story
├── Subtask 1
│   ├── Sub-subtask 1.1
│   └── Sub-subtask 1.2
│       └── Sub-sub-subtask 1.2.1
└── Subtask 2
```

All levels are flattened into a single list of acceptance criteria:
- Subtask 1
- Sub-subtask 1.1
- Sub-subtask 1.2
- Sub-sub-subtask 1.2.1
- Subtask 2

This ensures complete capture of all requirements regardless of nesting depth.

## Importing into Scope Playground

1. Run the conversion script to generate the JSON file
2. Open Scope Playground in your browser
3. Click the "Import Stories" button
4. Upload the generated JSON file
5. Review the preview and click "Import Stories"

The stories will be automatically positioned in the matrix based on their business value and effort estimates.

## Notes

- Only parent tasks are converted (subtasks are excluded but used for acceptance criteria)
- Tasks without names are skipped
- Default values are provided for missing fields
- All imported stories are marked as public by default
- Original ClickUp task IDs are preserved in the notes field for reference

## Example Output

```
✓ Successfully converted 13 stories
✓ Output written to: data/readyroofer_warrantee_stories.json

Summary:
  Total Stories: 13

  By Business Value:
    Critical: 6
    Important: 7

  By Category:
    Audit: 1
    Crew: 1
    Damage: 1
    Datatracking: 1
    Feature: 6
    Followup: 1
    Jobcreation: 1
    Notifications: 1
```
