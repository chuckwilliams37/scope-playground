import React, { useState, useEffect } from 'react';
import { Story } from '@/types';

type StoryFormProps = {
  story?: Story;
  onSave: (story: Story) => void;
  onCancel: () => void;
  categories: string[];
  businessValues: string[];
  effortCategories: string[];
};

export function StoryForm({
  story,
  onSave,
  onCancel,
  categories,
  businessValues,
  effortCategories
}: StoryFormProps) {
  // Form state
  const [title, setTitle] = useState(story?.title || '');
  const [userStory, setUserStory] = useState(story?.userStory || '');
  const [points, setPoints] = useState<number>(story?.points || story?.storyPoints || 3);
  const [businessValue, setBusinessValue] = useState(story?.businessValue || 'Important');
  const [category, setCategory] = useState(story?.category || (categories.length > 0 ? categories[0] : ''));
  const [effortCategory, setEffortCategory] = useState(story?.effortCategory || 'Medium');
  const [notes, setNotes] = useState(story?.notes || '');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>(story?.acceptanceCriteria || []);
  const [newCriterion, setNewCriterion] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Default point options following Fibonacci sequence
  const pointOptions = [1, 2, 3, 5, 8, 13, 21];
  
  // Map points to default effort categories
  const getDefaultEffortCategoryForPoints = (points: number): string => {
    if (points <= 3) {
      return 'Low';
    } else if (points <= 8) {
      return 'Medium';
    } else {
      return 'High';
    }
  };
  
  // Update effort category when points change
  useEffect(() => {
    const defaultCategory = getDefaultEffortCategoryForPoints(points);
    // Always set the effort category based on points
    setEffortCategory(defaultCategory);
  }, [points]);
  
  // Validate form fields
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!category) {
      newErrors.category = 'Category is required';
    }
    
    if (!businessValue) {
      newErrors.businessValue = 'Business value is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const updatedStory: Story = {
        _id: story?._id || 'temp-id', // This will be replaced by the backend
        title,
        userStory: userStory || '',
        points: points,
        storyPoints: points,
        businessValue: businessValue || 'Important', // Default to "Important" if not specified
        category: category || 'Feature', // Default to "Feature" if not specified
        effortCategory: effortCategory,
        notes: notes || '',
        acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : undefined
      };
      onSave(updatedStory);
    }
  };
  
  // Allow new category input if "Other" is selected
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  
  // Enable the "Add new" option in the dropdown
  useEffect(() => {
    if (isNewCategory) {
      setCategory('');
    }
  }, [isNewCategory]);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-h-[90vh] w-full max-w-2xl flex flex-col overflow-hidden transition-all">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">
            {story ? 'Edit Story' : 'Create New Story'}
          </h2>
        </div>
        
        <div className="overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="Short descriptive title"
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* User Story */}
            <div className="space-y-2">
              <label htmlFor="userStory" className="block text-sm font-medium text-gray-700">
                User Story
              </label>
              <textarea
                id="userStory"
                value={userStory}
                onChange={(e) => setUserStory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                rows={3}
                placeholder="As a [type of user], I want [goal] so that [benefit]"
              ></textarea>
            </div>

            {/* Two-column section for Business Value and Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Business Value */}
              <div className="space-y-2">
                <label htmlFor="businessValue" className="block text-sm font-medium text-gray-700">
                  Business Value <span className="text-red-500">*</span>
                </label>
                <select
                  id="businessValue"
                  value={businessValue}
                  onChange={(e) => setBusinessValue(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {businessValues.map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                {errors.businessValue && (
                  <p className="text-sm text-red-600">{errors.businessValue}</p>
                )}
              </div>

              {/* Story Points */}
              <div className="space-y-2">
                <label htmlFor="points" className="block text-sm font-medium text-gray-700">
                  Story Points
                </label>
                <select
                  id="points"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {pointOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Two-column section for Category and Effort Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Category */}
              <div className="space-y-2">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <div>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === 'Other') {
                        setIsNewCategory(true);
                        setCategory('');
                      } else {
                        setIsNewCategory(false);
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Other">Other...</option>
                  </select>
                  {isNewCategory && (
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => {
                        setNewCategory(e.target.value);
                        setCategory(e.target.value);
                      }}
                      className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Enter new category"
                    />
                  )}
                  {errors.category && (
                    <p className="text-sm text-red-600">{errors.category}</p>
                  )}
                </div>
              </div>

              {/* Effort Category (display only) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Effort Category
                </label>
                <div className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                  {effortCategory} <span className="text-gray-500 text-xs">(based on points)</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                rows={4}
                placeholder="Any additional notes about this story"
              ></textarea>
            </div>

            {/* Acceptance Criteria */}
            <div className="space-y-2 border-t pt-5 border-gray-200">
              <label className="block text-sm font-medium text-gray-700">
                Acceptance Criteria
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Add specific conditions that must be met for this story to be considered complete.
              </p>
              
              <div className="space-y-2 mb-3">
                {acceptanceCriteria.map((criterion, index) => (
                  <div key={index} className="flex items-center bg-gray-50 p-2 rounded-md">
                    <span className="flex-grow">{criterion}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newCriteria = [...acceptanceCriteria];
                        newCriteria.splice(index, 1);
                        setAcceptanceCriteria(newCriteria);
                      }}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex">
                <input
                  type="text"
                  value={newCriterion}
                  onChange={(e) => setNewCriterion(e.target.value)}
                  className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder="Enter acceptance criterion"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCriterion.trim()) {
                      setAcceptanceCriteria([...acceptanceCriteria, newCriterion.trim()]);
                      setNewCriterion('');
                    }
                  }}
                  className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add
                </button>
              </div>
            </div>
          </form>
        </div>
        
        {/* Buttons - Fixed at the bottom */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end space-x-3 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {story ? 'Update Story' : 'Create Story'}
          </button>
        </div>
      </div>
    </div>
  );
}
