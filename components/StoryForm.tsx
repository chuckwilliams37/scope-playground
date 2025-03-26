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
  const [effortCategory, setEffortCategory] = useState(story?.effortCategory || (effortCategories.length > 0 ? effortCategories[0] : ''));
  const [notes, setNotes] = useState(story?.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Default point options following Fibonacci sequence
  const pointOptions = [1, 2, 3, 5, 8, 13, 21];
  
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
        effortCategory: effortCategory || 'Medium',
        notes: notes || ''
      };
      onSave(updatedStory);
    }
  };
  
  // Allow new category input if "Other" is selected
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  
  // Allow new effort category input if "Other" is selected
  const [isNewEffortCategory, setIsNewEffortCategory] = useState(false);
  const [newEffortCategory, setNewEffortCategory] = useState('');
  
  // Enable the "Add new" option in the dropdown
  useEffect(() => {
    if (isNewCategory) {
      setCategory('');
    }
  }, [isNewCategory]);
  
  useEffect(() => {
    if (isNewEffortCategory) {
      setEffortCategory('');
    }
  }, [isNewEffortCategory]);
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md relative z-[100]">
      <h2 className="text-xl font-semibold mb-4">{story ? 'Edit Story' : 'Create New Story'}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.title ? 'border-red-500' : ''
            }`}
          />
          {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
        </div>
        
        {/* User Story input */}
        <div>
          <label htmlFor="userStory" className="block text-sm font-medium text-gray-700">
            User Story
          </label>
          <textarea
            id="userStory"
            value={userStory}
            onChange={(e) => setUserStory(e.target.value)}
            rows={3}
            placeholder="As a [role], I want [feature] so that [benefit]"
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
          />
        </div>
        
        {/* Points input */}
        <div className="relative">
          <label htmlFor="points" className="block text-sm font-medium text-gray-700">
            Story Points
          </label>
          <select
            id="points"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm relative z-[110]"
          >
            {pointOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        
        {/* Business Value input */}
        <div className="relative">
          <label htmlFor="businessValue" className="block text-sm font-medium text-gray-700">
            Business Value <span className="text-red-500">*</span>
          </label>
          <select
            id="businessValue"
            value={businessValue}
            onChange={(e) => setBusinessValue(e.target.value)}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm relative z-[110] ${
              errors.businessValue ? 'border-red-500' : ''
            }`}
          >
            {businessValues.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {errors.businessValue && <p className="mt-1 text-sm text-red-500">{errors.businessValue}</p>}
        </div>
        
        {/* Category input */}
        <div className="relative">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category <span className="text-red-500">*</span>
          </label>
          {isNewCategory ? (
            <div>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setCategory(e.target.value);
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter new category"
              />
              <button
                type="button"
                onClick={() => setIsNewCategory(false)}
                className="mt-1 text-sm text-blue-500 hover:text-blue-700"
              >
                Select from existing
              </button>
            </div>
          ) : (
            <div>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm relative z-[110] ${
                  errors.category ? 'border-red-500' : ''
                }`}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsNewCategory(true)}
                className="mt-1 text-sm text-blue-500 hover:text-blue-700"
              >
                Add new category
              </button>
            </div>
          )}
          {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
        </div>
        
        {/* Effort Category input */}
        <div className="relative">
          <label htmlFor="effortCategory" className="block text-sm font-medium text-gray-700">
            Effort Category
          </label>
          {isNewEffortCategory ? (
            <div>
              <input
                type="text"
                value={newEffortCategory}
                onChange={(e) => {
                  setNewEffortCategory(e.target.value);
                  setEffortCategory(e.target.value);
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter new effort category"
              />
              <button
                type="button"
                onClick={() => setIsNewEffortCategory(false)}
                className="mt-1 text-sm text-blue-500 hover:text-blue-700"
              >
                Select from existing
              </button>
            </div>
          ) : (
            <div>
              <select
                id="effortCategory"
                value={effortCategory}
                onChange={(e) => setEffortCategory(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm relative z-[110]"
              >
                {effortCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsNewEffortCategory(true)}
                className="mt-1 text-sm text-blue-500 hover:text-blue-700"
              >
                Add new effort category
              </button>
            </div>
          )}
        </div>
        
        {/* Notes input */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        
        {/* Form actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {story ? 'Save Changes' : 'Create Story'}
          </button>
        </div>
      </form>
    </div>
  );
}
