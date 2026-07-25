import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  maxStepReached?: number;
  onStepClick?: (stepId: number) => void;
}

const steps = [
  { id: 1, name: 'Objective' },
  { id: 2, name: 'Scope & Targets' },
  { id: 3, name: 'Analysis Matrix' },
  { id: 4, name: 'Synthesis' },
  { id: 5, name: 'Report' },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, maxStepReached = currentStep, onStepClick }) => {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol role="list" className="flex items-center justify-center w-full max-w-3xl mx-auto">
        {steps.map((step, stepIdx) => {
          const isUnlocked = step.id <= Math.max(currentStep, maxStepReached);
          const isCurrent = step.id === currentStep;

          return (
            <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className={`h-0.5 w-full ${step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
              </div>
              <button
                type="button"
                disabled={!isUnlocked || !onStepClick}
                onClick={() => isUnlocked && onStepClick && onStepClick(step.id)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-300 transition-all ${
                  isUnlocked && onStepClick ? 'cursor-pointer hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500' : 'cursor-default'
                }`}
                style={{
                  borderColor: step.id <= currentStep ? '#2563eb' : isUnlocked ? '#60a5fa' : '#d1d5db',
                  backgroundColor: step.id < currentStep ? '#2563eb' : 'white',
                }}
                title={isUnlocked ? `Go to ${step.name}` : undefined}
              >
                {step.id < currentStep ? (
                  <Check className="h-5 w-5 text-white" aria-hidden="true" />
                ) : (
                  <span className={`text-sm font-medium ${isCurrent ? 'text-blue-600 font-bold' : isUnlocked ? 'text-blue-500' : 'text-gray-500'}`}>
                    {step.id}
                  </span>
                )}
              </button>
              <button
                type="button"
                disabled={!isUnlocked || !onStepClick}
                onClick={() => isUnlocked && onStepClick && onStepClick(step.id)}
                className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap transition-colors ${
                  isCurrent ? 'text-blue-700 font-bold' : isUnlocked ? 'text-blue-600 hover:underline cursor-pointer' : 'text-gray-500 cursor-default'
                }`}
              >
                {step.name}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
