import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';
import { useLanguage } from '../contexts/LanguageContext';

interface CameraViewProps {
  onConfirm: (files: File[]) => void;
  onClose: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onConfirm, onClose }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // For capturing, not displayed
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(undefined);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);

  const [capturedImages, setCapturedImages] = useState<File[]>([]);
  const [capturedImagePreviews, setCapturedImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    const getDevices = async () => {
        try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
            tempStream.getTracks().forEach(track => track.stop());

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setAvailableDevices(videoDevices);

            if (videoDevices.length > 0) {
                const backCamera = videoDevices.find(device => device.label.toLowerCase().includes('back'));
                setCurrentDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
            } else {
                 setError('No camera found.');
                 setIsLoading(false);
            }
        } catch (err) {
             setError('Could not access camera. Please check permissions.');
             setIsLoading(false);
        }
    };
    getDevices();
  }, []);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
        setIsLoading(true);
        setError(null);
        setZoomCapabilities(null);

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        try {
            if (!currentDeviceId) {
                setIsLoading(false);
                return;
            }

            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: currentDeviceId },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            activeStream = newStream;
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
            setStream(newStream);

            const track = newStream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            if ('zoom' in capabilities && capabilities.zoom) {
                const zoomSettings = capabilities.zoom as { min: number; max: number; step: number; };
                setZoomCapabilities({
                    min: zoomSettings.min,
                    max: zoomSettings.max,
                    step: zoomSettings.step,
                });
                setZoomLevel(zoomSettings.min);
            }

        } catch (err) {
            console.error("Error accessing camera:", err);
            setError('Could not access camera. Please check permissions or try another device.');
        } finally {
            setIsLoading(false);
        }
    };

    if (currentDeviceId) {
        startCamera();
    }

    return () => {
        if (activeStream) {
            activeStream.getTracks().forEach(track => track.stop());
        }
    };
  }, [currentDeviceId]);

  useEffect(() => {
    if (!stream || !zoomCapabilities) return;
    const track = stream.getVideoTracks()[0];
    if (track && 'zoom' in track.getCapabilities()) {
      track.applyConstraints({ advanced: [{ zoom: zoomLevel } as any] })
        .catch(e => console.error('Failed to apply zoom', e));
    }
  }, [zoomLevel, stream, zoomCapabilities]);

  const previewsRef = useRef<string[]>([]);
  previewsRef.current = capturedImagePreviews;

  useEffect(() => {
    return () => {
      previewsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleSwitchCamera = useCallback(() => {
    if (availableDevices.length < 2) return;
    const currentIndex = availableDevices.findIndex(device => device.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    setCurrentDeviceId(availableDevices[nextIndex].deviceId);
  }, [availableDevices, currentDeviceId]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState >= video.HAVE_METADATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) {
            const fileName = `oral_photo_${new Date().toISOString()}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            setCapturedImages(prev => [...prev, file]);
            setCapturedImagePreviews(prev => [...prev, URL.createObjectURL(blob)]);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  }, []);

  const handleDone = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onConfirm(capturedImages);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  const handleRemoveImage = (indexToRemove: number) => {
    URL.revokeObjectURL(capturedImagePreviews[indexToRemove]);
    setCapturedImages(prev => prev.filter((_, i) => i !== indexToRemove));
    setCapturedImagePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
  };


  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
      {isLoading && <LoadingSpinner />}
      {error && <div className="text-white text-center"><p className="mb-4">{error}</p><button onClick={handleClose} className="bg-red-500 text-white font-bold py-2 px-4 rounded">{t('close')}</button></div>}

      <div className={`relative w-full h-full flex items-center justify-center ${isLoading || error ? 'hidden' : ''}`}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain"></video>
        
        {/* Mouth Shape Overlay Guide */}
        <svg viewBox="0 0 100 60" className="absolute w-4/5 max-w-md h-auto pointer-events-none">
          <path 
            d="M 5,30 C 10,5 40,0 50,0 S 90,5 95,30 90,55 50,55 10,55 5,30 Z" 
            fill="none" 
            stroke="rgba(255,255,255,0.7)" 
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        </svg>
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas> {/* Hidden canvas for capture */}

      {!isLoading && !error && availableDevices.length > 1 && (
        <button
          onClick={handleSwitchCamera}
          className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors z-20"
          aria-label="Switch camera"
        >
          <Icon type="switch" className="w-6 h-6" />
        </button>
      )}

      {!isLoading && !error && zoomCapabilities && (
        <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-3 bg-black bg-opacity-50 p-3 rounded-full z-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            
            <div className="h-32 sm:h-40 flex items-center">
                <input
                    type="range"
                    min={zoomCapabilities.min}
                    max={zoomCapabilities.max}
                    step={zoomCapabilities.step}
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                    className="w-32 sm:w-40 h-2 appearance-none bg-gray-200/50 rounded-full outline-none transform -rotate-90 cursor-pointer accent-teal-400"
                />
            </div>

            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
            
            <div className="absolute top-1/2 -translate-y-1/2 -left-14 bg-black bg-opacity-70 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                {zoomLevel.toFixed(1)}x
            </div>
        </div>
      )}

      {!isLoading && !error && (
        <>
        {capturedImages.length > 0 && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full px-4">
                <div className="flex justify-center items-center gap-x-2 p-2 bg-black bg-opacity-40 rounded-lg max-w-full overflow-x-auto">
                    {capturedImagePreviews.map((preview, index) => (
                         <div key={preview} className="relative w-12 h-12 flex-shrink-0">
                            <img src={preview} alt={`capture ${index + 1}`} className="w-full h-full object-cover rounded" />
                            <button
                                onClick={() => handleRemoveImage(index)}
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 flex items-center justify-center shadow-md hover:bg-red-700"
                                aria-label={`Remove image ${index + 1}`}
                            >
                                <Icon type="close" className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50 flex justify-center items-center space-x-6 sm:space-x-8">
            <button onClick={handleClose} className="text-white text-sm font-medium p-2 w-14 sm:w-16 text-center">{t('cancel')}</button>
            <button
              onClick={handleCapture}
              className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full border-4 border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              aria-label={t('capture')}
            ></button>
            <div className="w-14 sm:w-16 text-center">
              {capturedImages.length > 0 && (
                  <button onClick={handleDone} className="font-bold text-teal-400 p-2" >
                      {t('done')} ({capturedImages.length})
                  </button>
              )}
            </div>
        </div>
        </>
      )}
    </div>
  );
};

export default CameraView;
