import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { OralIssue } from '../types';

interface ImageWithBoundingBoxesProps {
  imageSrc: string;
  issues: OralIssue[];
  renderBoundingBoxContent: (issue: OralIssue, index: number) => React.ReactNode;
  imageClassName?: string;
  containerClassName?: string;
}

const ImageWithBoundingBoxes: React.FC<ImageWithBoundingBoxesProps> = ({
  imageSrc,
  issues,
  renderBoundingBoxContent,
  imageClassName = "object-contain w-full h-full",
  containerClassName = "relative w-full h-full flex justify-center items-center overflow-hidden", // Added flex centering and overflow hidden
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Reference to the parent container
  const [imageMetrics, setImageMetrics] = useState<{
    renderedWidth: number;
    renderedHeight: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const calculateImageMetrics = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;

    if (!img || !container || !img.naturalWidth || !img.naturalHeight) {
      setImageMetrics(null);
      return;
    }

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    const imgAspectRatio = naturalWidth / naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let renderedWidth = containerWidth;
    let renderedHeight = containerHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspectRatio > containerAspectRatio) {
      // Image is wider than container, height will be constrained by container height
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imgAspectRatio;
      offsetX = (containerWidth - renderedWidth) / 2;
    } else {
      // Image is taller than container, width will be constrained by container width
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imgAspectRatio;
      offsetY = (containerHeight - renderedHeight) / 2;
    }
    
    // Ensure rendered dimensions are positive
    renderedWidth = Math.max(0, renderedWidth);
    renderedHeight = Math.max(0, renderedHeight);

    setImageMetrics({
      renderedWidth,
      renderedHeight,
      offsetX,
      offsetY,
    });
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    const container = containerRef.current;

    if (img && container) {
      // Define handleLoad inside useEffect to keep it in scope for cleanup
      const handleLoad = () => {
        calculateImageMetrics();
      };

      img.addEventListener('load', handleLoad);
      window.addEventListener('resize', calculateImageMetrics); // Recalculate on window resize
      
      // Initial calculation if image is already loaded
      if (img.complete) {
        calculateImageMetrics();
      }
      
      return () => {
        // Cleanup function now has access to handleLoad
        if (img) {
          img.removeEventListener('load', handleLoad);
        }
        window.removeEventListener('resize', calculateImageMetrics);
      };
    }
  }, [imageSrc, calculateImageMetrics]); // Depend on imageSrc and calculateImageMetrics

  return (
    <div ref={containerRef} className={containerClassName}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Visual Evidence"
        className={imageClassName}
        // Removed onLoad here as it's added via addEventListener in useEffect
      />
      {imageMetrics && issues.map((issue, issueIndex) => {
        const { boundingBox } = issue;
        const { renderedWidth, renderedHeight, offsetX, offsetY } = imageMetrics;

        // Calculate final pixel positions for the bounding box
        const finalLeft = offsetX + (boundingBox.x / 100) * renderedWidth;
        const finalTop = offsetY + (boundingBox.y / 100) * renderedHeight;
        const finalWidth = (boundingBox.width / 100) * renderedWidth;
        const finalHeight = (boundingBox.height / 100) * renderedHeight;

        return (
          <div
            key={issueIndex}
            style={{
              position: 'absolute',
              left: `${finalLeft}px`,
              top: `${finalTop}px`,
              width: `${finalWidth}px`,
              height: `${finalHeight}px`,
              pointerEvents: 'none', // Allow clicks to pass through to elements behind
            }}
          >
            {renderBoundingBoxContent(issue, issueIndex)}
          </div>
        );
      })}
    </div>
  );
};

export default ImageWithBoundingBoxes;