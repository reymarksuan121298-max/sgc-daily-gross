import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export default function FilterDropdown({ icon: Icon, label, options, selectedValues, onSelect, placeholder, align = 'left' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  const toggleOption = (id) => {
    if (selectedValues.includes(id)) {
      onSelect(selectedValues.filter(v => v !== id));
    } else {
      onSelect([...selectedValues, id]);
    }
  };

  const isSelected = selectedValues.length > 0;
  // Format the label, e.g., "All Units" -> "Units", to say "1 Units" (as requested in screenshot style)
  const displayLabel = label.replace('All ', '');

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-200 font-extrabold text-[12px] tracking-wide",
          isSelected 
            ? "bg-[#6366f1] text-textPrimary shadow-[0_4px_20px_rgba(99,102,241,0.4)]" 
            : "bg-surface border border-border-divider text-textPrimary hover:bg-surface-hover"
        )}
      >
        <Icon className={clsx("w-4 h-4", isSelected ? "text-textPrimary" : "text-textSecondary")} />
        <span>
          {isSelected ? `${selectedValues.length} ${displayLabel}` : label}
        </span>
        <svg className={clsx("w-3.5 h-3.5 ml-1 transition-transform duration-200", isOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={clsx(
          "absolute mt-3 w-64 bg-surface-header border border-border-divider rounded-2xl shadow-2xl z-50 p-3",
          align === 'right' ? 'right-0' : 'left-0'
        )}>
          <div className="mb-3">
            <input 
              type="text" 
              placeholder={placeholder} 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface border border-border-divider rounded-xl px-4 py-3 text-[11px] font-semibold outline-none text-textPrimary focus:border-[#6366f1] transition-colors"
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            <button 
              onClick={() => onSelect([])}
              className={clsx(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left cursor-pointer font-bold text-[11px] tracking-wide",
                selectedValues.length === 0 
                  ? "bg-[#6366f1] text-textPrimary shadow-[0_0_15px_rgba(99,102,241,0.4)]" 
                  : "bg-surface text-textSecondary hover:bg-surface-hover border border-border-divider/50 hover:border-border-divider"
              )}
            >
              <span className="truncate pr-2">ALL {displayLabel.toUpperCase()}</span>
              {selectedValues.length === 0 && (
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            {filteredOptions.map(opt => {
              const isOptSelected = selectedValues.includes(opt.id);
              return (
                <button 
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left cursor-pointer font-bold text-[11px] tracking-wide",
                    isOptSelected 
                      ? "bg-[#6366f1] text-textPrimary shadow-[0_0_15px_rgba(99,102,241,0.4)]" 
                      : "bg-surface text-textSecondary hover:bg-surface-hover border border-border-divider/50 hover:border-border-divider"
                  )}
                >
                  <span className="truncate pr-2">{opt.name}</span>
                  {isOptSelected && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="p-4 text-[11px] text-textSecondary text-center font-bold uppercase tracking-widest">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
