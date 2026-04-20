import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

const ThemeToggle = () => {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <div className="flex items-center gap-1 bg-element border border-edge rounded-lg p-1">
      <button 
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-element-hover'}`}
        title="Light Mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button 
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-element-hover'}`}
        title="Dark Mode"
      >
        <Moon className="w-4 h-4" />
      </button>
      <button 
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-element-hover'}`}
        title="System Auto"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ThemeToggle;
