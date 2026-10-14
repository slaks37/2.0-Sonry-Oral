
import React, { useState, useCallback, useEffect } from 'react';
import { AppStep } from './types';
import type { PatientData, StuntingScreeningData, OralAnalysis, HealthReportData, ScreeningRecord, GrowthStatus } from './types';
import Header from './components/Header';
import StuntingScreening from './components/CameraInput';
import OralExamination from './components/OralExamination';
import HealthReport from './components/DataEntryForm';
import LoadingSpinner from './components/LoadingSpinner';
import Icon from './components/Icon';
import Dashboard from './components/Dashboard';
import Toast from './components/Toast';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import { analyzeOralImageWithBoundingBox, generateFinalReport, checkImageQuality } from './services/geminiService';
import { calculateStuntingStatus, calculateGrowthStatus, calculateWeightStatus, calculateWastingStatus, calculateBMI, calculateBMIStatus, calculateLilaStatus } from './services/stuntingCalculator';
import { useLanguage } from './contexts/LanguageContext';
import { getScreeningRecords, saveScreeningRecord, sendRecordToEMR } from './services/apiService';

const initialPatientData: PatientData = {
  nik: '', name: '', dob: '', gender: '', weight: '', height: '', headCircumference: '', armCircumference: ''
};

export const initialStuntingData: StuntingScreeningData = {
  ageGroup: null,
  exclusiveBreastfeeding: '', sugarInFormula: '',
  mpasiStartDate: '', mpasiMenu: [], mpasiTexture: '', snackFrequency: '',
  snackType: '', sweetDrinkFrequency: '', sleepWithBottle: '',
  gumCleaningStartDate: '', useSpecialToothpaste: '',
  mainMealsPerDay: '', dailyDietIncludes: [], isPickyEater: '', pickyEaterFoods: '',
  snackFrequencyOutside: '', favoriteSnack: '',
  weeklyConsumption: { soda: '', packagedSnacks: '', sweets: '', fastFood: '' },
  brushingFrequency: '', brushingHabits: [], dentalPain: ''
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const generateUniqueId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 7);
  return `SONRI-${timestamp}-${randomPart}`.toUpperCase();
};

const calculateAge = (dobString: string): { yearsFloat: number, totalMonths: number } => {
    if (!dobString) return { yearsFloat: 0, totalMonths: 0 };
    const dob = new Date(dobString);
    const today = new Date();

    if (dob > today) return { yearsFloat: 0, totalMonths: 0 };
    
    const diff_ms = today.getTime() - dob.getTime();
    const yearsFloat = diff_ms / 31557600000; // ms in a year
    
    let ageTotalMonths = (today.getFullYear() - dob.getFullYear()) * 12;
    ageTotalMonths -= dob.getMonth();
    ageTotalMonths += today.getMonth();
    if (today.getDate() < dob.getDate()) {
        ageTotalMonths--;
    }

    return { yearsFloat, totalMonths: ageTotalMonths < 0 ? 0 : ageTotalMonths };
};

const formatErrorMessage = (err: unknown): string => {
  if (!err) return "Terjadi kesalahan yang tidak diketahui.";
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error) {
      if (typeof parsed.error === 'string') return parsed.error;
      if (parsed.error.message) return parsed.error.message;
    }
    if (parsed.message) return parsed.message;
  } catch {
    // raw is not JSON, return as is
  }
  return raw;
};

const App: React.FC = () => {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<AppStep>(AppStep.HOME);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [patientData, setPatientData] = useState<PatientData>(initialPatientData);
  const [stuntingData, setStuntingData] = useState<StuntingScreeningData>(initialStuntingData);
  const [oralAnalyses, setOralAnalyses] = useState<OralAnalysis[]>([]);
  const [healthReport, setHealthReport] = useState<HealthReportData | null>(null);
  const [screeningRecords, setScreeningRecords] = useState<ScreeningRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Check for "session" (simple mock)
    const session = localStorage.getItem('sonri_session');
    if (session) {
      setIsLoggedIn(true);
      setStep(AppStep.LANDING);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
        const loadRecords = async () => {
            try {
                const storedRecords = await getScreeningRecords();
                setScreeningRecords(storedRecords);
            } catch (e) {
                console.error("Failed to load records", e);
            }
        };
        loadRecords();
    }
  }, [isLoggedIn]);

  const handleLogin = () => {
    localStorage.setItem('sonri_session', 'active');
    setIsLoggedIn(true);
    setStep(AppStep.LANDING);
    setToast({ message: 'Welcome back!', type: 'success' });
  };

  const handleSignup = () => {
    localStorage.setItem('sonri_session', 'active');
    setIsLoggedIn(true);
    setStep(AppStep.LANDING);
    setToast({ message: 'Account created successfully!', type: 'success' });
  };

  const handleLogout = () => {
    localStorage.removeItem('sonri_session');
    setIsLoggedIn(false);
    setStep(AppStep.HOME);
    resetState();
  };

  const resetState = useCallback(() => {
    setStep(isLoggedIn ? AppStep.LANDING : AppStep.HOME);
    setPatientData(initialPatientData);
    setStuntingData(initialStuntingData);
    setOralAnalyses([]);
    setHealthReport(null);
    setIsLoading(false);
    setError(null);
    setIsViewingHistory(false);
  }, [isLoggedIn]);

  const handleProceedToOralExam = () => {
    setError(null);
    if (!patientData.nik || !patientData.name || !patientData.dob || !patientData.gender || !patientData.weight || !patientData.height || !patientData.headCircumference || !patientData.armCircumference) {
        setError(t('fillAllFieldsError'));
        return;
    }
    setStep(AppStep.ORAL_EXAMINATION);
  }
  
  const handleImagesSelect = useCallback((files: File[]) => {
    const newAnalyses: OralAnalysis[] = files.map(file => ({
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
        analysisResult: null, // Initialize with null result
        imageQuality: 'checking',
    }));
    
    // Update UI immediately to show 'checking' state
    setOralAnalyses(prev => [...prev, ...newAnalyses]);
    setError(null);

    // Asynchronously check each new image
    newAnalyses.forEach(async (analysis) => {
        if (!analysis.imageFile) return;
        try {
            const qualityResult = await checkImageQuality(analysis.imageFile);
            setOralAnalyses(prev => {
                const indexToUpdate = prev.findIndex(a => a.imagePreview === analysis.imagePreview);
                if (indexToUpdate === -1) return prev;
                
                const updated = [...prev];
                updated[indexToUpdate] = {
                    ...updated[indexToUpdate],
                    imageQuality: qualityResult.quality,
                    qualityReason: qualityResult.reason,
                };
                return updated;
            });
        } catch (error) {
            console.error("Failed to check image quality:", error);
            // If check fails, update state to 'good' to avoid blocking user
            setOralAnalyses(prev => {
                const indexToUpdate = prev.findIndex(a => a.imagePreview === analysis.imagePreview);
                if (indexToUpdate === -1) return prev;
                const updated = [...prev];
                updated[indexToUpdate] = {
                    ...updated[indexToUpdate],
                    imageQuality: 'good',
                    qualityReason: 'Could not perform quality check.',
                };
                return updated;
            });
        }
    });
  }, []);

  const handleImageRemove = useCallback((indexToRemove: number) => {
    setOralAnalyses(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (oralAnalyses.length === 0 || oralAnalyses.some(a => !a.imageFile)) {
      setError(t('selectImageError'));
      return;
    }
     if (oralAnalyses.some(a => a.imageQuality === 'poor')) {
      setError("Please remove or replace the images marked with a quality warning.");
      return;
    }
    if (!patientData.dob || !patientData.height || !patientData.gender || !patientData.weight || !patientData.nik) {
        setError(t('patientDataMissingError'));
        return;
    }

    setIsLoading(true);
    setStep(AppStep.ANALYZING);
    setError(null);
    setIsViewingHistory(false);

    try {
      const { yearsFloat: ageInYears, totalMonths: ageInMonths } = calculateAge(patientData.dob);
      const heightInCm = parseFloat(patientData.height);
      const weightInKg = parseFloat(patientData.weight);
      const armCircumferenceCm = parseFloat(patientData.armCircumference);
      const gender = patientData.gender as 'Male' | 'Female';
      
      const metrics: Partial<HealthReportData> = {};

      if (ageInMonths <= 60) {
        // Analysis for children under 5
        const stunting = calculateStuntingStatus(ageInMonths, heightInCm, gender);
        const weight = calculateWeightStatus(ageInMonths, weightInKg, gender);
        const wasting = calculateWastingStatus(heightInCm, weightInKg, gender);
        
        metrics.stuntingStatus = stunting.status;
        metrics.heightForAgeZScore = stunting.zScore;
        metrics.weightStatus = weight.status;
        metrics.weightForAgeZScore = weight.zScore;
        metrics.wastingStatus = wasting.status;
        metrics.wastingZScore = wasting.zScore;
        metrics.lilaStatus = calculateLilaStatus(armCircumferenceCm);
      } else {
        // Analysis for children 5 and older
        const growth = calculateGrowthStatus(ageInMonths, heightInCm, gender);
        const bmi = calculateBMI(weightInKg, heightInCm);
        const bmiStatus = calculateBMIStatus(ageInMonths, bmi, gender);

        metrics.growthStatus = growth.status as GrowthStatus;
        metrics.bmi = bmi;
        metrics.bmiStatus = bmiStatus.status;
        metrics.lilaStatus = 'Not Applicable for this Age';
      }

      const analysisPromises = oralAnalyses.map(analysis => 
        analyzeOralImageWithBoundingBox(analysis.imageFile!, ageInYears)
      );
      const results = await Promise.all(analysisPromises);
      
      const updatedAnalyses = oralAnalyses.map((analysis, index) => ({
        ...analysis,
        analysisResult: results[index],
      }));
      setOralAnalyses(updatedAnalyses);

      const simplifiedOralResults = results.map(res => res.issues.map(issue => ({ diseaseName: issue.diseaseName })));
      const finalReport = await generateFinalReport(patientData, stuntingData, simplifiedOralResults, metrics, language);
      
      setHealthReport(finalReport);
      setStep(AppStep.REPORT);

    } catch (err) {
      setError(formatErrorMessage(err));
      setStep(AppStep.ORAL_EXAMINATION); 
    } finally {
        setIsLoading(false);
    }
  }, [oralAnalyses, patientData, stuntingData, language, t]);

  const handleSaveData = useCallback(async () => {
    if (!healthReport || oralAnalyses.some(a => !a.imageFile || !a.analysisResult)) return;

    // Convert images to base64 for storage
    const oralAnalysesForStorage = await Promise.all(
        oralAnalyses.map(async (analysis) => ({
            imageBase64: await fileToBase64(analysis.imageFile!), // Non-null assertion is safe
            analysisResult: analysis.analysisResult!,
        }))
    );

    const newRecord: ScreeningRecord = {
        id: generateUniqueId(),
        date: new Date().toISOString(),
        patientData,
        stuntingData,
        oralAnalyses: oralAnalysesForStorage,
        healthReport,
    };
    
    try {
        await saveScreeningRecord(newRecord);
        const updatedRecords = await getScreeningRecords(); // Re-fetch to update state
        setScreeningRecords(updatedRecords);

        // After successfully saving, attempt to send to EMR
        const emrResponse = await sendRecordToEMR(newRecord);

        if (emrResponse.success) { // This part is for a real implementation
             setToast({ message: t('dataSavedAndEmrSyncSuccess'), type: 'success' });
        } else { // This is what will happen in the mock, showing the attempt was made
             setToast({ message: t('dataSavedEmrSyncFailed'), type: 'success' });
        }

    } catch (e) {
        console.error("Failed to save data:", e);
        setToast({ message: t('dataSavedError'), type: 'error' });
    }
  }, [patientData, stuntingData, oralAnalyses, healthReport, t]);

  const handleViewRecord = useCallback((record: ScreeningRecord) => {
    setPatientData(record.patientData);
    setStuntingData(record.stuntingData);
    setHealthReport(record.healthReport);
    
    // Transform stored oral analyses for display
    const historicalAnalyses: OralAnalysis[] = record.oralAnalyses.map(analysis => ({
        imagePreview: analysis.imageBase64, // The report component can render base64 directly
        analysisResult: analysis.analysisResult,
        imageQuality: 'good', // Assume stored images were good
        // imageFile is not available here, but not needed for viewing
    }));
    setOralAnalyses(historicalAnalyses);
    
    setIsViewingHistory(true);
    setStep(AppStep.REPORT);
  }, []);


  const renderStep = () => {
    switch (step) {
      case AppStep.HOME:
        return <HomePage onLogin={() => setStep(AppStep.LOGIN)} onSignup={() => setStep(AppStep.SIGNUP)} />;
      case AppStep.LOGIN:
        return <LoginPage onLoginSuccess={handleLogin} onSignupClick={() => setStep(AppStep.SIGNUP)} onBack={() => setStep(AppStep.HOME)} />;
      case AppStep.SIGNUP:
        return <SignupPage onSignupSuccess={handleSignup} onLoginClick={() => setStep(AppStep.LOGIN)} onBack={() => setStep(AppStep.HOME)} />;
      case AppStep.LANDING:
        return (
            <div className="w-full text-center flex flex-col items-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
                    <span className="bg-teal-600 text-white px-4 py-2 rounded-lg tracking-widest mr-2">SONRI</span>
                    <span className="text-teal-700">{t('headerTitle')}</span>
                </h1>
                <p className="text-lg text-gray-500 mb-8">{t('tagline')}</p>
                <div className="w-full max-w-md space-y-3">
                    <button
                        onClick={() => setStep(AppStep.STUNTING_SCREENING)}
                        className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-transform transform active:scale-95 shadow-lg"
                    >
                        {t('startScreening')}
                    </button>
                    <button
                        onClick={() => setStep(AppStep.DASHBOARD)}
                        className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 transition-transform transform active:scale-95 shadow-lg"
                    >
                        {t('viewDashboard')}
                    </button>
                </div>
            </div>
        )
      case AppStep.STUNTING_SCREENING:
        return (
            <div className="w-full">
                <StuntingScreening 
                    patientData={patientData} 
                    stuntingData={stuntingData} 
                    onPatientDataChange={setPatientData}
                    onStuntingDataChange={setStuntingData}
                    records={screeningRecords}
                />
                 <button
                    onClick={handleProceedToOralExam}
                    className="mt-6 w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-transform transform active:scale-95 shadow-lg flex items-center justify-center"
                >
                    {t('nextOralExam')}
                </button>
                <button onClick={() => setStep(AppStep.LANDING)} className="mt-2 w-full text-gray-600 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center">
                    <Icon type="back" className="w-5 h-5 mr-1" />
                    {t('backToHome')}
                </button>
            </div>
        );
      case AppStep.ORAL_EXAMINATION:
        return (
             <div className="w-full">
                <OralExamination 
                    onImagesSelect={handleImagesSelect} 
                    oralAnalyses={oralAnalyses}
                    onImageRemove={handleImageRemove}
                />
                {oralAnalyses.length > 0 && (
                     <button
                        onClick={handleStartAnalysis}
                        disabled={oralAnalyses.some(a => a.imageQuality === 'checking')}
                        className="mt-6 w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-transform transform active:scale-95 shadow-lg flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {oralAnalyses.some(a => a.imageQuality === 'checking') ? t('checkingQuality') : t('analyzeAndGenerate')}
                    </button>
                )}
                 <button onClick={() => setStep(AppStep.STUNTING_SCREENING)} className="mt-2 w-full text-gray-600 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center">
                    <Icon type="back" className="w-5 h-5 mr-1" />
                    {t('backToDataScreening')}
                  </button>
            </div>
        );
       case AppStep.ANALYZING:
        return (
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-lg font-semibold text-gray-700">{t('analyzingTitle')}</p>
            <p className="text-gray-500">{t('analyzingSubtitle', { count: oralAnalyses.length })}</p>
          </div>
        );
       case AppStep.REPORT:
        return (
             <div className="w-full">
                {healthReport && <HealthReport report={healthReport} patient={patientData} oralAnalyses={oralAnalyses} onViewDashboard={() => setStep(AppStep.DASHBOARD)} isViewingHistory={isViewingHistory} />}
                
                {isViewingHistory && (
                  <button onClick={() => setStep(AppStep.DASHBOARD)} className="mt-2 w-full text-gray-600 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center">
                    <Icon type="back" className="w-5 h-5 mr-1" />
                    {t('backToDashboard')}
                  </button>
                )}

                {!isViewingHistory && (
                  <>
                    <div className="flex space-x-2 mt-4">
                        <button
                            onClick={handleSaveData}
                            className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-transform transform active:scale-95 shadow-lg flex items-center justify-center"
                        >
                            <Icon type="save" className="w-5 h-5 mr-2" />
                            {t('saveRecord')}
                        </button>
                        <button
                            onClick={resetState}
                            className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-transform transform active:scale-95 shadow-lg"
                        >
                            {t('newScreening')}
                        </button>
                    </div>
                    <button onClick={() => setStep(AppStep.ORAL_EXAMINATION)} className="mt-2 w-full text-gray-600 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center">
                        <Icon type="back" className="w-5 h-5 mr-1" />
                        {t('backToOralExam')}
                    </button>
                  </>
                )}
             </div>
        );
      case AppStep.DASHBOARD:
          return <Dashboard onNewScreening={resetState} onViewRecord={handleViewRecord} onBack={() => setStep(AppStep.LANDING)} />
      default:
        return null;
    }
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <Header isLoggedIn={isLoggedIn} onLogout={handleLogout} />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <main className="flex justify-center items-start p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl p-4 sm:p-8 bg-white rounded-lg shadow-md">
            {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 w-full" role="alert">
                <strong className="font-bold">{t('errorPrefix')} </strong>
                <span className="block sm:inline">{error}</span>
            </div>
            )}
            {renderStep()}
        </div>
      </main>
    </div>
  );
};

export default App;
