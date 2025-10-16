# Quick Start: ClickUp to Scope Playground Conversion

## One-Command Conversion

```bash
python3 scripts/convert_clickup_csv_to_json.py "path/to/clickup-export.csv" "path/to/output.json"
```

## Example (ReadyRoofer Warrantee Project)

```bash
python3 scripts/convert_clickup_csv_to_json.py \
  "data/2025-10-15T17_52_34.539Z The Agency Project V 0 1 - Ready Roofer - RR Dev Projects - RR Warrantee Special Projects.csv" \
  "data/readyroofer_warrantee_stories.json"
```

**Result**: ✓ Successfully converted 13 stories

## Import to Scope Playground

1. Open Scope Playground
2. Click **"Import Stories"** button
3. Upload `data/readyroofer_warrantee_stories.json`
4. Review preview
5. Click **"Import Stories"**

## What Gets Converted

✓ Task names → Story titles  
✓ Task descriptions → User stories  
✓ Priorities → Business value (Critical/Important/Nice to Have)  
✓ Status → Effort estimates (Low/Medium/High)  
✓ Story points → Direct mapping  
✓ Tags → Categories  
✓ Subtasks → Acceptance criteria  

## Customization

Edit `scripts/convert_clickup_csv_to_json.py` to adjust:

- **Line 18-27**: Priority to business value mapping
- **Line 30-39**: Status to effort mapping  
- **Line 42-62**: Story points estimation logic
- **Line 65-91**: Acceptance criteria extraction

## Troubleshooting

**Issue**: "File not found"  
**Solution**: Check CSV file path is correct

**Issue**: "Invalid file format"  
**Solution**: Ensure CSV is from ClickUp export (not manually created)

**Issue**: "No stories converted"  
**Solution**: Check that CSV contains "Task" type rows (not just subtasks)

## Tips

- Export from ClickUp using **"..."** menu → **Export** → **CSV**
- Only parent tasks are converted (subtasks become acceptance criteria)
- Original ClickUp IDs are preserved in the notes field
- All stories default to public visibility
- Matrix positions are auto-calculated from business value + effort

## Need Help?

See full documentation: `scripts/README_CLICKUP_CONVERSION.md`
