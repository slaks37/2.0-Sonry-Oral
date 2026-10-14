import React, { useRef, useState, useEffect } from 'react';
import Icon from './Icon';
import type { OralAnalysis } from '../types';
import CameraView from './CameraView';
import { useLanguage } from '../contexts/LanguageContext';
import AnalysisResultDisplay from './AnalysisResultDisplay';

interface OralExaminationProps {
  onImagesSelect: (files: File[]) => void;
  oralAnalyses: OralAnalysis[];
  onImageRemove: (index: number) => void;
}

const OralExamination: React.FC<OralExaminationProps> = ({ onImagesSelect, oralAnalyses, onImageRemove }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  const hasImages = oralAnalyses.length > 0;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length > 0) {
      onImagesSelect(files);
    }
    event.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmCapture = (files: File[]) => {
    onImagesSelect(files);
    setIsCameraOpen(false);
  };

  const handleScroll = () => {
    if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollLeft = container.scrollLeft;
            const children = Array.from(container.children);
            
            let closestIndex = 0;
            let minDistance = Infinity;
            const containerCenter = scrollLeft + container.offsetWidth / 2;

            children.forEach((child, index) => {
                const el = child as HTMLElement;
                const childCenter = el.offsetLeft + el.offsetWidth / 2;
                const distance = Math.abs(containerCenter - childCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                }
            });
            
            setCurrentIndex(closestIndex);
        }
    }, 150);
  };

  const scrollToIndex = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const targetChild = container.children[index] as HTMLElement;
    if (targetChild) {
        const containerWidth = container.offsetWidth;
        const childWidth = targetChild.offsetWidth;
        const childLeft = targetChild.offsetLeft;
        const scrollLeft = childLeft - (containerWidth / 2) + (childWidth / 2);
        
        container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
    }
  };

  const handlePrev = () => scrollToIndex(Math.max(0, currentIndex - 1));
  const handleNext = () => scrollToIndex(Math.min(oralAnalyses.length - 1, currentIndex + 1));
  
  useEffect(() => {
    const container = scrollContainerRef.current;
    if(container && hasImages) {
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [hasImages]);


  return (
    <>
      <div className="w-full flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-700 mb-1">{t('step2Title')}</h2>
        <p className="text-gray-500 mb-6 text-center">{t('step2Subtitle')}</p>
        
        {!hasImages && (
          <div className="w-full max-w-md text-center">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 mb-4">
              <Icon type="camera" className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => setIsCameraOpen(true)}
                  className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-transform transform active:scale-95 shadow-md flex items-center justify-center"
                >
                  <Icon type="camera" className="w-5 h-5 mr-2" />
                  {t('takePhoto')}
                </button>
                <button
                  onClick={handleUploadClick}
                  className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 transition-transform transform active:scale-95 shadow-md flex items-center justify-center"
                >
                  <Icon type="upload" className="w-5 h-5 mr-2" />
                  {t('uploadFromGallery')}
                </button>
              </div>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />
        
        {hasImages && (
          <div className="w-full max-w-full mt-4">
            <h3 className="font-semibold text-lg text-gray-800 mb-3 text-center sm:text-left">{t('analysisResults')}</h3>
            <div className="relative">
                 {currentIndex > 0 && (
                    <button 
                        onClick={handlePrev} 
                        className="absolute left-0 sm:left-1 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2.5 shadow-lg transition-all hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        aria-label={t('previousImage')}
                    >
                        <Icon type="chevron-left" className="w-6 h-6 text-gray-700" />
                    </button>
                )}

                <div 
                  ref={scrollContainerRef} 
                  className="flex overflow-x-auto space-x-4 pb-4 snap-x snap-mandatory"
                >
                    {oralAnalyses.map((analysis, analysisIndex) => (
                        <div key={analysis.imagePreview + analysisIndex} className="snap-center flex-shrink-0 first:pl-4 last:pr-4 sm:first:pl-0 sm:last:pl-0">
                            <AnalysisResultDisplay
                                analysis={analysis}
                                analysisIndex={analysisIndex}
                                onRemove={onImageRemove}
                            />
                        </div>
                    ))}
                </div>
                
                {currentIndex < oralAnalyses.length - 1 && (
                    <button 
                        onClick={handleNext} 
                        className="absolute right-0 sm:right-1 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2.5 shadow-lg transition-all hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        aria-label={t('nextImage')}
                    >
                        <Icon type="chevron-right" className="w-6 h-6 text-gray-700" />
                    </button>
                )}
            </div>
            
            <div className="flex justify-center items-center space-x-2 mt-4">
              {oralAnalyses.map((_, index) => (
                  <button
                      key={index}
                      onClick={() => scrollToIndex(index)}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${currentIndex === index ? 'bg-teal-600' : 'bg-gray-300 hover:bg-gray-400'}`}
                      aria-label={`Go to image ${index + 1}`}
                  />
              ))}
            </div>

            <p className="text-center text-sm text-gray-600 font-medium mt-2">
                Image {currentIndex + 1} of {oralAnalyses.length}
            </p>

            <div className="flex flex-col space-y-2 pt-6 max-w-md mx-auto">
              <button
                onClick={() => setIsCameraOpen(true)}
                className="w-full border border-teal-500 text-teal-600 font-semibold py-2 px-4 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center"
              >
                <Icon type="camera" className="w-5 h-5 mr-2" />
                {t('takeAnotherPhoto')}
              </button>
              <button
                onClick={handleUploadClick}
                className="w-full border border-gray-400 text-gray-600 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <Icon type="upload" className="w-5 h-5 mr-2" />
                {t('addFromGallery')}
              </button>
            </div>
          </div>
        )}

      </div>

      {isCameraOpen && (
        <CameraView 
          onConfirm={handleConfirmCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </>
  );
};

export default OralExamination;