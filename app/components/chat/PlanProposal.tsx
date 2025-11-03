/**
 * Plan Proposal Component
 * Displays AI's proposed plan for building screens
 */

import React from 'react';

interface Screen {
  name: string;
  description: string;
}

interface PlanProposalProps {
  screens: Screen[];
  totalScreens: number;
  onApprove: () => void;
  onReject: () => void;
}

export function PlanProposal({ screens, totalScreens, onApprove, onReject }: PlanProposalProps) {
  return (
    <div className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg p-6 my-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="i-ph:lightbulb text-3xl text-yellow-500 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-1">
            Proposed Build Plan
          </h3>
          <p className="text-sm text-bolt-elements-textSecondary">
            I'll create {totalScreens} screens for your application
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {screens.map((screen, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-bolt-elements-background-depth-3 rounded-lg"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="font-medium text-bolt-elements-textPrimary text-sm">
                {screen.name}
              </p>
              <p className="text-xs text-bolt-elements-textSecondary mt-1">
                {screen.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-bolt-elements-borderColor">
        <button
          onClick={onApprove}
          className="flex-1 bg-black hover:bg-gray-900 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <div className="i-ph:check-circle" />
          Approve & Build
        </button>
        <button
          onClick={onReject}
          className="px-4 py-2.5 bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded-lg font-medium transition-colors"
        >
          Modify Plan
        </button>
      </div>
    </div>
  );
}
