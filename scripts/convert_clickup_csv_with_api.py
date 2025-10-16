#!/usr/bin/env python3
"""
Convert ClickUp CSV export to Scope Playground JSON format with API enhancement.

This script reads a ClickUp CSV export and uses the ClickUp MCP server to fetch
subtask details, then converts everything to the JSON format expected by the 
Scope Playground ImportStoriesPanel component.

Usage:
    python convert_clickup_csv_with_api.py <csv_file_path> <list_id> [output_json_path]
    
Example:
    python convert_clickup_csv_with_api.py "data/export.csv" "901320468061" "data/output.json"
"""

import csv
import json
import sys
import subprocess
from datetime import datetime
from typing import Dict, List, Any, Optional


def get_task_from_clickup(task_id: str) -> Optional[Dict[str, Any]]:
    """Fetch task details from ClickUp using MCP."""
    try:
        # Use the mcp CLI tool to fetch task details
        result = subprocess.run(
            ['mcp', 'call', 'clickup', 'getTaskById', json.dumps({"id": task_id})],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            # Parse the output to extract task name
            output = result.stdout
            # Simple parsing - look for name field
            for line in output.split('\n'):
                if line.startswith('name:'):
                    name = line.split('name:', 1)[1].strip()
                    return {"name": name, "id": task_id}
        return None
    except Exception as e:
        print(f"Warning: Could not fetch task {task_id} from ClickUp: {e}", file=sys.stderr)
        return None


def map_priority_to_business_value(priority: str) -> str:
    """Map ClickUp priority to Scope Playground business value."""
    priority_map = {
        "HIGH": "Critical",
        "URGENT": "Critical",
        "NORMAL": "Important",
        "MEDIUM": "Important",
        "LOW": "Nice to Have",
        "none": "Nice to Have",
        "": "Nice to Have"
    }
    return priority_map.get(priority.upper() if priority else "", "Important")


def map_status_to_effort(status: str) -> str:
    """Map ClickUp status to effort category."""
    status_map = {
        "captured": "Low",
        "defined": "Medium",
        "in progress": "High",
        "complete": "Low",
        "": "Medium"
    }
    return status_map.get(status.lower() if status else "", "Medium")


def estimate_points(story_points: str, time_estimate: str, subtask_count: int) -> int:
    """Estimate story points from available data."""
    # First, try to use the Story Points field
    if story_points and story_points.strip():
        try:
            return int(float(story_points))
        except (ValueError, TypeError):
            pass
    
    # Next, try to use time estimate
    if time_estimate and time_estimate.strip():
        try:
            hours = float(time_estimate)
            # Convert hours to story points (rough estimate: 1 point = 2-4 hours)
            return max(1, int(hours / 3))
        except (ValueError, TypeError):
            pass
    
    # Use subtask count as a proxy
    if subtask_count > 0:
        return min(13, max(1, subtask_count))
    
    # Default to 3 points
    return 3


def extract_acceptance_criteria(task_content: str, subtasks: List[str]) -> List[str]:
    """Extract acceptance criteria from task content and subtasks."""
    criteria = []
    
    # Parse task content for bullet points or numbered lists
    if task_content:
        lines = task_content.strip().split('\n')
        for line in lines:
            line = line.strip()
            # Look for lines that start with bullets, numbers, or "As"
            if line and (
                line.startswith('- ') or 
                line.startswith('* ') or 
                line.startswith('• ') or
                (len(line) > 2 and line[0].isdigit() and line[1] in '.)')
            ):
                criteria.append(line.lstrip('- *•0123456789.) '))
    
    # Add subtask names as acceptance criteria
    for subtask in subtasks:
        if subtask and subtask.strip():
            criteria.append(subtask.strip())
    
    return criteria if criteria else ["Complete the task as described"]


def parse_csv_to_stories(csv_file_path: str, fetch_subtasks: bool = True) -> List[Dict[str, Any]]:
    """Parse ClickUp CSV export and convert to Scope Playground story format."""
    # First pass: collect all tasks
    all_tasks = {}
    parent_tasks = []
    
    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            task_type = row.get('Task Type', '').strip()
            if task_type.lower() != 'task':
                continue
            
            task_id = row.get('Task ID', '').strip()
            task_name = row.get('Task Name', '').strip()
            
            if not task_name or not task_id:
                continue
            
            # Store all tasks in lookup map
            all_tasks[task_id] = row
            
            # Identify parent tasks (those with subtasks)
            subtask_ids = row.get("Subtask ID's", '').strip()
            has_subtasks = subtask_ids and subtask_ids != '[]'
            
            if has_subtasks:
                parent_tasks.append(task_id)
    
    # Second pass: build stories from parent tasks
    stories = []
    
    for task_id in parent_tasks:
        row = all_tasks[task_id]
        
        # Extract basic fields
        task_name = row.get('Task Name', '').strip()
        status = row.get('Status', '').strip()
        task_content = row.get('Task Content', '').strip()
        priority = row.get('Priority', '').strip()
        tags = row.get('tags', '').strip()
        story_points = row.get('Story Points (number)', '').strip()
        time_estimate = row.get('Time Estimate (hours)', '').strip()
        
        # Parse subtasks and get their names
        subtask_ids_str = row.get("Subtask ID's", '').strip()
        subtask_ids = [s.strip() for s in subtask_ids_str.strip('[]').split(',') if s.strip()]
        
        # Collect subtask names for acceptance criteria
        subtask_names = []
        for subtask_id in subtask_ids:
            # First check if subtask is in CSV
            if subtask_id in all_tasks:
                subtask_name = all_tasks[subtask_id].get('Task Name', '').strip()
                if subtask_name:
                    subtask_names.append(subtask_name)
            # If not in CSV and fetch_subtasks is enabled, try to fetch from ClickUp
            elif fetch_subtasks:
                print(f"Fetching subtask {subtask_id} from ClickUp...", file=sys.stderr)
                task_data = get_task_from_clickup(subtask_id)
                if task_data and task_data.get('name'):
                    subtask_names.append(task_data['name'])
        
        subtask_count = len(subtask_ids)
        
        # Map fields to Scope Playground format
        business_value = map_priority_to_business_value(priority)
        effort = map_status_to_effort(status)
        points = estimate_points(story_points, time_estimate, subtask_count)
        
        # Extract category from tags or use default
        category = "Feature"
        if tags:
            tag_list = [t.strip() for t in tags.strip('[]').split(',')]
            if tag_list and tag_list[0]:
                # Capitalize first tag as category
                category = tag_list[0].strip().title()
        
        # Build acceptance criteria from subtask names
        acceptance_criteria = subtask_names if subtask_names else extract_acceptance_criteria(task_content, [])
        
        # Create story object
        story = {
            "id": f"rr-{task_id}",
            "title": task_name,
            "userStory": task_content if task_content else f"As a user, I want {task_name.lower()}",
            "points": points,
            "businessValue": business_value,
            "category": category,
            "position": {
                "value": business_value,
                "effort": effort,
                "rank": len(stories) + 1
            },
            "acceptanceCriteria": acceptance_criteria,
            "notes": f"Imported from ClickUp. Original ID: {task_id}, Status: {status}",
            "isPublic": True,
            "sharedWithClients": []
        }
        
        stories.append(story)
    
    return stories


def main():
    """Main execution function."""
    if len(sys.argv) < 2:
        print("Usage: python convert_clickup_csv_with_api.py <csv_file_path> [output_json_path]")
        sys.exit(1)
    
    csv_file_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Generate default output path if not provided
    if not output_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"clickup_stories_{timestamp}.json"
    
    try:
        # Parse CSV and convert to stories (with API fetching enabled)
        print("Converting ClickUp CSV to Scope Playground JSON...", file=sys.stderr)
        stories = parse_csv_to_stories(csv_file_path, fetch_subtasks=True)
        
        # Create output structure
        output = {
            "stories": stories,
            "metadata": {
                "source": "ClickUp CSV Export with API Enhancement",
                "importDate": datetime.now().isoformat(),
                "totalStories": len(stories)
            }
        }
        
        # Write to JSON file
        with open(output_path, 'w', encoding='utf-8') as jsonfile:
            json.dump(output, jsonfile, indent=2, ensure_ascii=False)
        
        print(f"✓ Successfully converted {len(stories)} stories")
        print(f"✓ Output written to: {output_path}")
        
        # Print summary
        print("\nSummary:")
        print(f"  Total Stories: {len(stories)}")
        
        # Count by business value
        value_counts = {}
        for story in stories:
            value = story['businessValue']
            value_counts[value] = value_counts.get(value, 0) + 1
        
        print("\n  By Business Value:")
        for value, count in sorted(value_counts.items()):
            print(f"    {value}: {count}")
        
        # Count by category
        category_counts = {}
        for story in stories:
            category = story['category']
            category_counts[category] = category_counts.get(category, 0) + 1
        
        print("\n  By Category:")
        for category, count in sorted(category_counts.items()):
            print(f"    {category}: {count}")
        
    except FileNotFoundError:
        print(f"Error: File not found: {csv_file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
