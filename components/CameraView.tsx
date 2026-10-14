import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';
import { useLanguage } from '../contexts/LanguageContext';
import { ToothViewType } from '../types';

export interface CapturedPhoto {
  file: File;
  viewType: ToothViewType;
  previewUrl: string;
}

interface CameraViewProps {
  onConfirm: (photos: { file: File; viewType: ToothViewType }[]) => void;
  onClose: () => void;
}

const VIEW_OPTIONS: { id: ToothViewType; labelId: string; labelEn: string; hint: string }[] = [
  { id: 'FRONT_VIEW', labelId: 'Tampak Depan', labelEn: 'Front View', hint: 'Gigi seri atas & bawah saat oklusi/sedikit terbuka' },
  { id: 'UPPER_OCCLUSAL', labelId: 'Oklusal Atas', labelEn: 'Upper Occlusal', hint: 'Permukaan kunyah molar & premolar rahang atas' },
  { id: 'LOWER_OCCLUSAL', labelId: 'Oklusal Bawah', labelEn: 'Lower Occlusal', hint: 'Permukaan kunyah molar & premolar rahang bawah' },
  { id: 'RIGHT_BUCCAL', labelId: 'Bukal Kanan', labelEn: 'Right Buccal', hint: 'Sisi luar gigi geraham & taring sebelah kanan' },
  { id: 'LEFT_BUCCAL', labelId: 'Bukal Kiri', labelEn: 'Left Buccal', hint: 'Sisi luar gigi geraham & taring sebelah kiri' },
  { id: 'GENERAL_VIEW', labelId: 'Umum / Balita', labelEn: 'General / Toddler', hint: 'Alternatif untuk anak balita / kondisi lapangan' },
];

const CameraView: React.FC<CameraViewProps> = ({ onConfirm, onClose }) => {
  const { t, language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(undefined);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);

  const [selectedView, setSelectedView] = useState<ToothViewType>('FRONT_VIEW');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach((track) => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === 'videoinput');
        setAvailableDevices(videoDevices);

        if (videoDevices.length > 0) {
          const backCamera = videoDevices.find((device) => device.label.toLowerCase().includes('back'));
          setCurrentDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
        } else {
          setError('No camera found.');
          setIsLoading(false);
        }
      } catch {
        setError('Could not access camera. Please check camera permissions.');
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
        stream.getTracks().forEach((track) => track.stop());
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
            height: { ideal: 1080 },
          },
        });

        activeStream = newStream;
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setStream(newStream);

        const track = newStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        if ('zoom' in capabilities && capabilities.zoom) {
          const zoomSettings = capabilities.zoom as { min: number; max: number; step: number };
          setZoomCapabilities({
            min: zoomSettings.min,
            max: zoomSettings.max,
            step: zoomSettings.step,
          });
          setZoomLevel(zoomSettings.min);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
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
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentDeviceId]);

  useEffect(() => {
    if (!stream || !zoomCapabilities) return;
    const track = stream.getVideoTracks()[0];
    if (track && 'zoom' in track.getCapabilities()) {
      track.applyConstraints({ advanced: [{ zoom: zoomLevel } as any] }).catch(() => {});
    }
  }, [zoomLevel, stream, zoomCapabilities]);

  const previewsRef = useRef<CapturedPhoto[]>([]);
  previewsRef.current = capturedPhotos;

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const handleSwitchCamera = useCallback(() => {
    if (availableDevices.length < 2) return;
    const currentIndex = availableDevices.findIndex((device) => device.deviceId === currentDeviceId);
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
        canvas.toBlob((blob) => {
          if (blob) {
            const fileName = `oral_${selectedView.toLowerCase()}_${Date.now()}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            const previewUrl = URL.createObjectURL(blob);
            setCapturedPhotos((prev) => [
              ...prev,
              { file, viewType: selectedView, previewUrl },
            ]);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  }, [selectedView]);

  const handleDone = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    onConfirm(capturedPhotos.map((p) => ({ file: p.file, viewType: p.viewType })));
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    onClose();
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    URL.revokeObjectURL(capturedPhotos[indexToRemove].previewUrl);
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const currentViewMeta = VIEW_OPTIONS.find((v) => v.id === selectedView) || VIEW_OPTIONS[0];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-between p-3 select-none">
      {isLoading && <LoadingSpinner />}
      {error && (
        <div className="text-white text-center m-auto">
          <p className="mb-4">{error}</p>
          <button onClick={handleClose} className="bg-red-500 text-white font-bold py-2 px-4 rounded">
            {t('close')}
          </button>
        </div>
      )}

      {/* Top Bar: View Type Selector */}
      {!isLoading && !error && (
        <div className="w-full z-20 flex flex-col items-center space-y-1.5 pt-1">
          <div className="flex overflow-x-auto space-x-2 max-w-full px-2 py-1 scrollbar-none">
            {VIEW_OPTIONS.map((opt) => {
              const isSelected = selectedView === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedView(opt.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-md ${
                    isSelected
                      ? 'bg-teal-500 text-white ring-2 ring-white'
                      : 'bg-black/60 text-gray-200 hover:bg-black/80'
                  }`}
                >
                  {language === 'id' ? opt.labelId : opt.labelEn}
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-teal-200/90 bg-black/60 px-3 py-0.5 rounded-full backdrop-blur-sm">
            💡 {currentViewMeta.hint}
          </div>
        </div>
      )}

      {/* Camera Video Viewport */}
      <div className={`relative w-full flex-grow flex items-center justify-center overflow-hidden my-2 ${isLoading || error ? 'hidden' : ''}`}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain"></video>

        {/* View-Specific Clinical Overlay Guides */}
        {selectedView === 'FRONT_VIEW' && (
          <svg viewBox="0 0 100 60" className="absolute w-4/5 max-w-md h-auto pointer-events-none opacity-70">
            <path
              d="M 5,30 C 10,5 40,0 50,0 S 90,5 95,30 90,55 50,55 10,55 5,30 Z"
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="1.8"
              strokeDasharray="4 4"
            />
          </svg>
        )}

        {(selectedView === 'UPPER_OCCLUSAL' || selectedView === 'LOWER_OCCLUSAL') && (
          <svg viewBox="0 0 100 80" className="absolute w-3/4 max-w-sm h-auto pointer-events-none opacity-70">
            <path
              d="M 15,70 C 15,20 40,5 50,5 C 60,5 85,20 85,70"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          </svg>
        )}

        {(selectedView === 'RIGHT_BUCCAL' || selectedView === 'LEFT_BUCCAL') && (
          <svg viewBox="0 0 100 60" className="absolute w-3/4 max-w-sm h-auto pointer-events-none opacity-70">
            <ellipse cx="50" cy="30" rx="42" ry="22" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeDasharray="4 4" />
          </svg>
        )}

        {selectedView === 'GENERAL_VIEW' && (
          <svg viewBox="0 0 100 70" className="absolute w-4/5 max-w-md h-auto pointer-events-none opacity-60">
            <rect x="10" y="10" width="80" height="50" rx="15" fill="none" stroke="#fcd34d" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Switch Camera Button */}
      {!isLoading && !error && availableDevices.length > 1 && (
        <button
          onClick={handleSwitchCamera}
          className="absolute top-16 right-4 bg-black/60 text-white rounded-full p-2.5 hover:bg-black/80 transition-colors z-20 shadow-md"
          aria-label="Ganti Kamera"
        >
          <Icon type="switch" className="w-5 h-5" />
        </button>
      )}

      {/* Bottom Controls */}
      {!isLoading && !error && (
        <div className="w-full z-20 flex flex-col items-center pb-2">
          {/* Thumbnails of captured photos */}
          {capturedPhotos.length > 0 && (
            <div className="flex justify-center items-center gap-x-2.5 p-2 bg-black/60 backdrop-blur-sm rounded-xl max-w-full overflow-x-auto mb-3 shadow">
              {capturedPhotos.map((photo, index) => (
                <div key={photo.previewUrl} className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-teal-400">
                  <img src={photo.previewUrl} alt={`capture ${index + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white text-center font-bold truncate px-0.5">
                    {photo.viewType.replace('_VIEW', '').replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 flex items-center justify-center shadow hover:bg-red-700"
                    aria-label={`Hapus foto ${index + 1}`}
                  >
                    <Icon type="close" className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Trigger row */}
          <div className="w-full flex justify-between items-center px-6 max-w-md">
            <button onClick={handleClose} className="text-white text-sm font-semibold hover:text-gray-300 transition-colors">
              {t('cancel')}
            </button>
            <button
              onClick={handleCapture}
              className="w-16 h-16 bg-white rounded-full border-4 border-teal-500 shadow-xl active:scale-95 transition-transform flex items-center justify-center"
              aria-label={t('capture')}
            >
              <div className="w-12 h-12 bg-white rounded-full border-2 border-gray-300" />
            </button>
            <button
              onClick={handleDone}
              disabled={capturedPhotos.length === 0}
              className={`font-bold text-sm px-3 py-1.5 rounded-lg transition-all ${
                capturedPhotos.length > 0 ? 'bg-teal-500 text-white shadow-md' : 'text-gray-500 opacity-50 cursor-not-allowed'
              }`}
            >
              {t('done')} ({capturedPhotos.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraView;
