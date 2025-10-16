#!/usr/bin/env python3
"""
Convert ClickUp CSV export to Scope Playground JSON format.

This script reads a ClickUp CSV export and converts it to the JSON format
expected by the Scope Playground ImportStoriesPanel component.
"""

import csv
import json
import sys
from datetime import datetime
from typing import Dict, List, Any


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


def load_subtask_names(subtask_file_path: str = None) -> Dict[str, List[str]]:
    """Load subtask names from JSON file."""
    if not subtask_file_path:
        # Try default location
        import os
        script_dir = os.path.dirname(os.path.abspath(__file__))
        subtask_file_path = os.path.join(script_dir, '..', 'data', 'subtask_names.json')
    
    try:
        with open(subtask_file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def get_all_subtask_ids_recursive(task_id: str, all_tasks: Dict[str, Any], visited: set = None) -> List[str]:
    """Recursively get all subtask IDs, flattening nested structures."""
    if visited is None:
        visited = set()
    
    # Prevent infinite loops
    if task_id in visited:
        return []
    visited.add(task_id)
    
    result = []
    
    if task_id not in all_tasks:
        return result
    
    row = all_tasks[task_id]
    subtask_ids_str = row.get("Subtask ID's", '').strip()
    direct_subtasks = [s.strip() for s in subtask_ids_str.strip('[]').split(',') if s.strip()]
    
    for subtask_id in direct_subtasks:
        # Add the direct subtask
        result.append(subtask_id)
        # Recursively get any nested subtasks
        nested = get_all_subtask_ids_recursive(subtask_id, all_tasks, visited)
        result.extend(nested)
    
    return result


def parse_csv_to_stories(csv_file_path: str, subtask_names_map: Dict[str, List[str]] = None) -> List[Dict[str, Any]]:
    """Parse ClickUp CSV export and convert to Scope Playground story format."""
    if subtask_names_map is None:
        subtask_names_map = {}
    
    # First pass: collect all tasks and build a lookup map
    all_tasks = {}
    all_subtask_ids = set()
    
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
            
            # Track all subtask IDs
            subtask_ids_str = row.get("Subtask ID's", '').strip()
            if subtask_ids_str and subtask_ids_str != '[]':
                subtasks = [s.strip() for s in subtask_ids_str.strip('[]').split(',') if s.strip()]
                all_subtask_ids.update(subtasks)
    
    # Identify parent tasks (tasks that have subtasks but are NOT themselves subtasks)
    parent_tasks = []
    for task_id, row in all_tasks.items():
        subtask_ids = row.get("Subtask ID's", '').strip()
        has_subtasks = subtask_ids and subtask_ids != '[]'
        is_subtask = task_id in all_subtask_ids
        
        # Only include top-level parents (not nested subtasks with their own subtasks)
        if has_subtasks and not is_subtask:
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
        
        # Parse subtasks and get ALL nested subtasks (flattened)
        all_flattened_subtask_ids = get_all_subtask_ids_recursive(task_id, all_tasks)
        
        # Collect subtask names for acceptance criteria
        subtask_names = []
        
        # First, check if we have subtask names from the mapping file
        if task_id in subtask_names_map:
            subtask_names = subtask_names_map[task_id]
        else:
            # Fall back to CSV lookup - get names for ALL flattened subtasks
            for subtask_id in all_flattened_subtask_ids:
                if subtask_id in all_tasks:
                    subtask_name = all_tasks[subtask_id].get('Task Name', '').strip()
                    if subtask_name:
                        subtask_names.append(subtask_name)
        
        subtask_count = len(all_flattened_subtask_ids)
        
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
        print("Usage: python convert_clickup_csv_to_json.py <csv_file_path> [output_json_path]")
        sys.exit(1)
    
    csv_file_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Generate default output path if not provided
    if not output_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"clickup_stories_{timestamp}.json"
    
    try:
        # Load subtask names mapping
        subtask_names_map = load_subtask_names()
        
        # Parse CSV and convert to stories
        stories = parse_csv_to_stories(csv_file_path, subtask_names_map)
        
        # Create output structure
        output = {
            "stories": stories,
            "metadata": {
                "source": "ClickUp CSV Export",
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
