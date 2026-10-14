import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

interface InfoTooltipProps {
  text: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const toggleTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-flex items-center ml-2" ref={tooltipRef}>
      <button onClick={toggleTooltip} type="button" className="text-teal-500 hover:text-teal-700 focus:outline-none">
        <Icon type="info" className="w-5 h-5" />
      </button>
      {isOpen && (
        <div 
          className="absolute z-10 w-64 p-3 text-sm font-normal text-left text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg -translate-x-full -left-2 bottom-full mb-2"
        >
          <div className="absolute w-3 h-3 bg-white border-b border-r border-gray-200 transform rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
          {text}
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;
