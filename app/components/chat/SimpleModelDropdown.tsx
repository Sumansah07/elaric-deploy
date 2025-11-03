import React, { useState, useRef, useEffect } from 'react';
import { classNames } from '~/utils/classNames';

// Best models from each provider via OpenRouter (except Gemini)
const BEST_MODELS = [

  // Anthropic (via OpenRouter)
  { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4.5', provider: 'OpenRouter', icon: 'i-ph:robot' },
  { value: 'anthropic/claude-3.5-haiku', label: 'Claude sonnet 4', provider: 'OpenRouter', icon: 'i-ph:robot' },
  { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus', provider: 'OpenRouter', icon: 'i-ph:robot' },
  
    // Google Gemini (Direct API)
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'Google', icon: 'i-ph:google-logo' },
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash', provider: 'Google', icon: 'i-ph:google-logo' },
  
  // OpenAI (via OpenRouter)
  { value: 'openai/gpt-4o', label: 'GPT-4o', provider: 'OpenRouter', icon: 'i-ph:brain' },
    { value: 'qwen/qwen3-coder', label: 'qwen3-coder', provider: 'OpenRouter', icon: 'i-ph:wind' },

  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenRouter', icon: 'i-ph:brain' },
  { value: 'openai/o1', label: 'GPT-o1', provider: 'OpenRouter', icon: 'i-ph:brain' },
  

  // X.AI Grok (via OpenRouter)
  { value: 'x-ai/grok-4', label: 'Grok 4', provider: 'OpenRouter', icon: 'i-ph:x-logo' },
  { value: 'x-ai/grok-2-1212', label: 'Grok 3', provider: 'OpenRouter', icon: 'i-ph:x-logo' },
  { value: 'x-ai/grok-beta', label: 'Grok Beta', provider: 'OpenRouter', icon: 'i-ph:x-logo' },
  
  // DeepSeek (via OpenRouter)
  { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', provider: 'OpenRouter', icon: 'i-ph:brain' },
  { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1', provider: 'OpenRouter', icon: 'i-ph:brain' },
  
  // Meta Llama (via OpenRouter)
  { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', provider: 'OpenRouter', icon: 'i-ph:lightning' },
  { value: 'meta-llama/llama-3.1-405b-instruct', label: 'Llama 3.1 405B', provider: 'OpenRouter', icon: 'i-ph:lightning' },
  
  // Mistral (via OpenRouter)
  { value: 'mistralai/mistral-medium', label: 'Mistral Medium', provider: 'OpenRouter', icon: 'i-ph:wind' },

];



interface SimpleModelDropdownProps {
  selectedModel: string;
  onModelChange: (model: string, provider: string) => void;
  isWorkbenchOpen?: boolean;
}

export const SimpleModelDropdown: React.FC<SimpleModelDropdownProps> = ({ selectedModel, onModelChange, isWorkbenchOpen = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const defaultModel = BEST_MODELS[0];
  const currentModel = BEST_MODELS.find(m => m.value === selectedModel) || defaultModel;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs',
          'bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3',
          'border border-bolt-elements-borderColor',
          'text-bolt-elements-textPrimary transition-all',
          isOpen && 'ring-2 ring-bolt-elements-focus'
        )}
        title={currentModel.label}
      >
        <div className="i-ph:cpu text-base" />
        <span className="hidden sm:inline">{currentModel.label}</span>
        <div className={classNames('i-ph:caret-down text-xs transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className={classNames(
          'absolute right-0 w-64 py-1 rounded-lg border border-bolt-elements-borderColor bg-black shadow-lg z-50',
          isWorkbenchOpen ? 'bottom-full mb-2' : 'top-full mt-2'
        )}>
          <div className="px-2 py-1.5 text-xs text-bolt-elements-textSecondary border-b border-bolt-elements-borderColor">
            Select AI Model
          </div>
          <div className="max-h-80 overflow-y-auto">
            {BEST_MODELS.map((model) => (
              <button
                key={model.value}
                onClick={() => {
                  onModelChange(model.value, model.provider);
                  setIsOpen(false);
                }}
                className={classNames(
                  'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
                  'bg-black hover:bg-gray-800 transition-colors',
                  currentModel.value === model.value && 'text-bolt-elements-textAccent'
                )}
              >
                <div className={classNames(model.icon, 'text-base')} />
                <div className="flex-1">
                  <div className="font-medium">{model.label}</div>
                  <div className="text-xs text-bolt-elements-textSecondary">{model.provider}</div>
                </div>
                {currentModel.value === model.value && (
                  <div className="i-ph:check text-green-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
