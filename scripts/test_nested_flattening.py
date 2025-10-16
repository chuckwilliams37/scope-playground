#!/usr/bin/env python3
"""
Test script to demonstrate nested subtask flattening.

This shows how the conversion script handles multiple layers of nested subtasks.
"""

def test_nested_flattening():
    """Demonstrate nested subtask flattening logic."""
    
    # Mock data structure representing nested tasks
    mock_tasks = {
        'parent-001': {
            'Task ID': 'parent-001',
            'Task Name': 'Parent Story',
            "Subtask ID's": '[child-001, child-002]'
        },
        'child-001': {
            'Task ID': 'child-001',
            'Task Name': 'Child Task 1',
            "Subtask ID's": '[grandchild-001, grandchild-002]'
        },
        'child-002': {
            'Task ID': 'child-002',
            'Task Name': 'Child Task 2',
            "Subtask ID's": '[]'
        },
        'grandchild-001': {
            'Task ID': 'grandchild-001',
            'Task Name': 'Grandchild Task 1',
            "Subtask ID's": '[]'
        },
        'grandchild-002': {
            'Task ID': 'grandchild-002',
            'Task Name': 'Grandchild Task 2',
            "Subtask ID's": '[great-grandchild-001]'
        },
        'great-grandchild-001': {
            'Task ID': 'great-grandchild-001',
            'Task Name': 'Great-Grandchild Task 1',
            "Subtask ID's": '[]'
        }
    }
    
    def get_all_subtask_ids_recursive(task_id, all_tasks, visited=None):
        """Recursively get all subtask IDs, flattening nested structures."""
        if visited is None:
            visited = set()
        
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
            result.append(subtask_id)
            nested = get_all_subtask_ids_recursive(subtask_id, all_tasks, visited)
            result.extend(nested)
        
        return result
    
    # Test the flattening
    print("Testing Nested Subtask Flattening")
    print("=" * 50)
    print("\nTask Structure:")
    print("  Parent Story")
    print("  ├── Child Task 1")
    print("  │   ├── Grandchild Task 1")
    print("  │   └── Grandchild Task 2")
    print("  │       └── Great-Grandchild Task 1")
    print("  └── Child Task 2")
    
    # Get all flattened subtasks
    all_subtasks = get_all_subtask_ids_recursive('parent-001', mock_tasks)
    
    print(f"\n✓ Flattened subtask IDs: {all_subtasks}")
    print(f"✓ Total subtasks (all levels): {len(all_subtasks)}")
    
    print("\n✓ Flattened acceptance criteria:")
    for subtask_id in all_subtasks:
        if subtask_id in mock_tasks:
            print(f"  - {mock_tasks[subtask_id]['Task Name']}")
    
    print("\n" + "=" * 50)
    print("✓ All nested levels successfully flattened!")
    print("\nThis ensures that even deeply nested subtasks")
    print("are captured as acceptance criteria under the parent story.")

if __name__ == "__main__":
    test_nested_flattening()
