import { useState, useEffect } from 'react';

const Loader = ({ size = 'md', fullPage = false, text = 'Loading...' }) => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const loaderClasses = `animate-spin rounded-full border-4 border-solid border-current border-r-transparent`;

  const containerClasses = fullPage 
    ? 'fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50'
    : 'flex items-center justify-center';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-4">
        <div
          className={`${loaderClasses} ${sizes[size]}`}
          style={{ animationTimingFunction: 'cubic-bezier(0.5, 0, 0.5, 1)' }}
          role="status"
        >
          <span className="sr-only">Loading...</span>
        </div>
        {text && <p className="text-gray-600 text-sm font-medium">{text}</p>}
      </div>
    </div>
  );
};

// Skeleton Loader Component
export const SkeletonLoader = ({ count = 3 }) => {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
      ))}
    </div>
  );
};

// Dots Loader Component
export const DotsLoader = () => {
  return (
    <div className="flex space-x-2 justify-center items-center">
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
  );
};

export default Loader;