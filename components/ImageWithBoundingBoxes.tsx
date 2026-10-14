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
  containerClassName = "relative w-full h-full flex justify-center items-center overflow-hidden",
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

    if (containerWidth <= 0 || containerHeight <= 0) {
      setImageMetrics(null);
      return;
    }

    const imgAspectRatio = naturalWidth / naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let renderedWidth = containerWidth;
    let renderedHeight = containerHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspectRatio > containerAspectRatio) {
      // Image is wider than container
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imgAspectRatio;
      offsetX = 0;
      offsetY = (containerHeight - renderedHeight) / 2;
    } else {
      // Image is taller than container
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imgAspectRatio;
      offsetX = (containerWidth - renderedWidth) / 2;
      offsetY = 0;
    }
    
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
      const handleLoad = () => {
        calculateImageMetrics();
      };

      img.addEventListener('load', handleLoad);
      window.addEventListener('resize', calculateImageMetrics);
      
      if (img.complete) {
        calculateImageMetrics();
      }
      
      return () => {
        if (img) {
          img.removeEventListener('load', handleLoad);
        }
        window.removeEventListener('resize', calculateImageMetrics);
      };
    }
  }, [imageSrc, calculateImageMetrics]);

  return (
    <div ref={containerRef} className={containerClassName}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Visual Evidence"
        className={imageClassName}
      />
      {imageMetrics && issues.map((issue, issueIndex) => {
        const { boundingBox } = issue;
        
        // Safeguard: Do not render boxes if boundingBox is null or has zero area
        if (!boundingBox || typeof boundingBox.x !== 'number' || typeof boundingBox.y !== 'number' || !boundingBox.width || !boundingBox.height) {
          return null;
        }

        if (boundingBox.width <= 0 || boundingBox.height <= 0) {
          return null;
        }

        const { renderedWidth, renderedHeight, offsetX, offsetY } = imageMetrics;

        // Clamp coordinates within [0, 100]
        const clampedX = Math.max(0, Math.min(100, boundingBox.x));
        const clampedY = Math.max(0, Math.min(100, boundingBox.y));
        const clampedWidth = Math.max(0, Math.min(100 - clampedX, boundingBox.width));
        const clampedHeight = Math.max(0, Math.min(100 - clampedY, boundingBox.height));

        if (clampedWidth <= 0.1 || clampedHeight <= 0.1) {
          return null;
        }

        // Calculate final pixel positions for the bounding box
        const finalLeft = offsetX + (clampedX / 100) * renderedWidth;
        const finalTop = offsetY + (clampedY / 100) * renderedHeight;
        const finalWidth = (clampedWidth / 100) * renderedWidth;
        const finalHeight = (clampedHeight / 100) * renderedHeight;

        return (
          <div
            key={issueIndex}
            style={{
              position: 'absolute',
              left: `${finalLeft}px`,
              top: `${finalTop}px`,
              width: `${finalWidth}px`,
              height: `${finalHeight}px`,
              pointerEvents: 'none',
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