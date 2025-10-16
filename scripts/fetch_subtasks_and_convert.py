#!/usr/bin/env python3
"""
Fetch subtask details from ClickUp and enhance the CSV conversion.

This script reads the CSV, identifies parent tasks with subtasks,
and outputs a mapping file that can be used to enhance the conversion.
"""

import csv
import json
import sys

def extract_subtask_mapping(csv_file_path: str) -> dict:
    """Extract parent task to subtask ID mapping from CSV."""
    mapping = {}
    
    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            task_type = row.get('Task Type', '').strip()
            if task_type.lower() != 'task':
                continue
            
            task_id = row.get('Task ID', '').strip()
            task_name = row.get('Task Name', '').strip()
            subtask_ids_str = row.get("Subtask ID's", '').strip()
            
            if not task_id or not task_name:
                continue
            
            # Parse subtask IDs
            if subtask_ids_str and subtask_ids_str != '[]':
                subtask_ids = [s.strip() for s in subtask_ids_str.strip('[]').split(',') if s.strip()]
                if subtask_ids:
                    mapping[task_id] = {
                        'task_name': task_name,
                        'subtask_ids': subtask_ids
                    }
    
    return mapping

def main():
    if len(sys.argv) < 2:
        print("Usage: python fetch_subtasks_and_convert.py <csv_file_path>")
        sys.exit(1)
    
    csv_file_path = sys.argv[1]
    mapping = extract_subtask_mapping(csv_file_path)
    
    print("# Subtask Mapping")
    print(f"# Found {len(mapping)} parent tasks with subtasks\n")
    
    for task_id, data in mapping.items():
        print(f"## {data['task_name']} (ID: {task_id})")
        print(f"Subtask IDs: {', '.join(data['subtask_ids'])}")
        print()
    
    # Output as JSON for programmatic use
    output_file = "subtask_mapping.json"
    with open(output_file, 'w') as f:
        json.dump(mapping, f, indent=2)
    
    print(f"\n✓ Mapping saved to {output_file}")
    print("\nTo fetch subtask names, run these ClickUp MCP commands:")
    for task_id, data in mapping.items():
        for subtask_id in data['subtask_ids']:
            print(f"  mcp0_getTaskById({subtask_id})")

if __name__ == "__main__":
    main()
