import * as React from 'react';

export function SimpleTest() {
  // Try using React.useState instead of destructured import
  const [count, setCount] = React.useState(0);

  return (
    <div className="p-6 max-w-md mx-auto mt-10 bg-bolt-elements-background-depth-2 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4 text-bolt-elements-textPrimary">Testing React Hooks</h1>
      <p className="text-lg mb-4 text-bolt-elements-textSecondary">
        Count: <span className="font-semibold text-bolt-elements-textPrimary">{count}</span>
      </p>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Increment
      </button>
      <button
        onClick={() => setCount(0)}
        className="ml-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
      >
        Reset
      </button>
    </div>
  );
}
