import React, { useEffect, useMemo, useState } from 'react';
import type { PatientData, StuntingScreeningData, ScreeningRecord } from '../types';
import InfoTooltip from './InfoTooltip';
import { useLanguage } from '../contexts/LanguageContext';
import { initialStuntingData } from '../App';
import PatientHistoryChart from './PatientHistoryChart';


interface StuntingScreeningProps {
  patientData: PatientData;
  stuntingData: StuntingScreeningData;
  onPatientDataChange: (data: PatientData) => void;
  onStuntingDataChange: (data: StuntingScreeningData) => void;
  records: ScreeningRecord[];
}

const proteinSources = [
    { value: 'Fish', labelKey: 'proteinFish' }, { value: 'Chicken', labelKey: 'proteinChicken' },
    { value: 'Eggs', labelKey: 'proteinEggs' }, { value: 'Tofu/Tempeh', labelKey: 'proteinTofuTempeh' },
    { value: 'Meat', labelKey: 'proteinMeat' }, { value: 'Dairy', labelKey: 'proteinDairy' },
];
const carbSources024 = [
    { value: 'Rice', labelKey: 'carbRice' }, { value: 'Corn', labelKey: 'carbCorn' },
    { value: 'Cassava', labelKey: 'carbCassava' }, { value: 'Potatoes', labelKey: 'carbPotatoes' },
    { value: 'Bread/Noodles', labelKey: 'carbBreadNoodles' }, { value: 'Bubur', labelKey: 'carbPorridge' },
];
const carbSources24 = [
    { value: 'Rice', labelKey: 'carbRice' }, { value: 'Corn', labelKey: 'carbCorn' },
    { value: 'Cassava', labelKey: 'carbCassava' }, { value: 'Potatoes', labelKey: 'carbPotatoes' },
    { value: 'Bread/Noodles', labelKey: 'carbBreadNoodles' },
];
const otherEssentials = [
    { value: 'Fat', labelKey: 'essentialsFat' }, { value: 'Vegetables', labelKey: 'essentialsVegetables' },
    { value: 'Fruits', labelKey: 'essentialsFruits' },
];
const otherEssentials24 = [
    { value: 'Vegetables', labelKey: 'essentialsVegetables' }, { value: 'Fruits', labelKey: 'essentialsFruits' },
];
const brushingHabitsOptions = [
    { value: 'After Breakfast', labelKey: 'brushAfterBreakfast' },
    { value: 'Before Bed', labelKey: 'brushBeforeBed' },
];

const calculateAgeInMonths = (dob: string): number | null => {
    if (!dob) return null;
    const dobDate = new Date(dob);
    const today = new Date();
    
    // Check if the DOB is in the future
    if (dobDate > today) return 0;

    let months = (today.getFullYear() - dobDate.getFullYear()) * 12;
    months -= dobDate.getMonth();
    months += today.getMonth();
    if (today.getDate() < dobDate.getDate()) {
        months--;
    }
    return months <= 0 ? 0 : months;
};


const StuntingScreening: React.FC<StuntingScreeningProps> = ({ 
    patientData, 
    stuntingData, 
    onPatientDataChange, 
    onStuntingDataChange,
    records,
}) => {
  const { t, language } = useLanguage();
  const ageInMonths = useMemo(() => calculateAgeInMonths(patientData.dob), [patientData.dob]);
  const isAdult = useMemo(() => ageInMonths !== null && ageInMonths > 17 * 12, [ageInMonths]);
  const [historyRecords, setHistoryRecords] = useState<ScreeningRecord[]>([]);
  
  const isOver5Years = useMemo(() => ageInMonths !== null && ageInMonths > 60, [ageInMonths]);

  useEffect(() => {
    if (patientData.nik && patientData.nik.length > 5) {
        const patientRecords = records.filter(r => r.patientData.nik === patientData.nik.trim());
        setHistoryRecords(patientRecords);
    } else {
        setHistoryRecords([]);
    }
  }, [patientData.nik, records]);
  
  useEffect(() => {
    let newAgeGroup: '0-24' | '>24' | null = null;
    if (ageInMonths !== null) {
      if (ageInMonths <= 24) {
        newAgeGroup = '0-24';
      } else {
        newAgeGroup = '>24';
      }
    }

    if (newAgeGroup !== stuntingData.ageGroup) {
      const updatedData = { ...stuntingData, ageGroup: newAgeGroup };
      
      // If switching to 0-24, clear the data for >24 questions
      if (newAgeGroup === '0-24') {
        updatedData.mainMealsPerDay = initialStuntingData.mainMealsPerDay;
        updatedData.dailyDietIncludes = initialStuntingData.dailyDietIncludes;
        updatedData.isPickyEater = initialStuntingData.isPickyEater;
        updatedData.pickyEaterFoods = initialStuntingData.pickyEaterFoods;
        updatedData.snackFrequencyOutside = initialStuntingData.snackFrequencyOutside;
        updatedData.favoriteSnack = initialStuntingData.favoriteSnack;
        updatedData.weeklyConsumption = initialStuntingData.weeklyConsumption;
        updatedData.brushingFrequency = initialStuntingData.brushingFrequency;
        updatedData.brushingHabits = initialStuntingData.brushingHabits;
        updatedData.dentalPain = initialStuntingData.dentalPain;
      } 
      // If switching to >24, clear the data for 0-24 questions
      else if (newAgeGroup === '>24') {
        updatedData.exclusiveBreastfeeding = initialStuntingData.exclusiveBreastfeeding;
        updatedData.sugarInFormula = initialStuntingData.sugarInFormula;
        updatedData.mpasiStartDate = initialStuntingData.mpasiStartDate;
        updatedData.mpasiMenu = initialStuntingData.mpasiMenu;
        updatedData.mpasiTexture = initialStuntingData.mpasiTexture;
        updatedData.snackFrequency = initialStuntingData.snackFrequency;
        updatedData.snackType = initialStuntingData.snackType;
        updatedData.sweetDrinkFrequency = initialStuntingData.sweetDrinkFrequency;
        updatedData.sleepWithBottle = initialStuntingData.sleepWithBottle;
        updatedData.gumCleaningStartDate = initialStuntingData.gumCleaningStartDate;
        updatedData.useSpecialToothpaste = initialStuntingData.useSpecialToothpaste;
      }
      
      onStuntingDataChange(updatedData);
    }
  }, [ageInMonths, stuntingData.ageGroup, onStuntingDataChange]);
  
   useEffect(() => {
    // When age changes to over 5 years, clear the circumference data
    if (isOver5Years) {
      if (patientData.headCircumference !== '' || patientData.armCircumference !== '') {
        onPatientDataChange({
          ...patientData,
          headCircumference: '',
          armCircumference: '',
        });
      }
    }
  }, [isOver5Years, patientData, onPatientDataChange]);


  const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onPatientDataChange({ ...patientData, [e.target.name]: e.target.value });
  };
  
  const handleStuntingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onStuntingDataChange({ ...stuntingData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    const currentValues = (stuntingData[name as keyof StuntingScreeningData] as string[]) || [];
    let newValues;
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(item => item !== value);
    }
    onStuntingDataChange({ ...stuntingData, [name]: newValues });
  };

  const handleNestedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const [parent, child] = name.split('.');
    onStuntingDataChange({
      ...stuntingData,
      [parent]: {
        ...(stuntingData[parent as keyof StuntingScreeningData] as object),
        [child]: value
      }
    });
  };

  const LabelWithInfo: React.FC<{ text: string; info: string }> = ({ text, info }) => (
    <div className="flex items-center">
      <label className="block text-sm font-medium text-gray-700">{text}</label>
      <InfoTooltip text={info} />
    </div>
  );

  const inputClass = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900";

  const renderQuestionnaire = () => {
    if (stuntingData.ageGroup === '0-24') {
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-gray-800 border-b pb-1 pt-4">{t('nutritionalStatusAndHabits')}</h3>
          <div>
            <LabelWithInfo text={t('q_exclusiveBreastfeeding')} info={t('info_exclusiveBreastfeeding')} />
            <select name="exclusiveBreastfeeding" value={stuntingData.exclusiveBreastfeeding} onChange={handleStuntingChange} className={inputClass}>
                <option value="">{t('select')}</option><option value="yes">{t('yes')}</option><option value="no">{t('no')}</option>
            </select>
          </div>
          <div>
            <LabelWithInfo text={t('q_sugarInFormula')} info={t('info_sugarInFormula')} />
            <select name="sugarInFormula" value={stuntingData.sugarInFormula} onChange={handleStuntingChange} className={inputClass}>
                <option value="">{t('select')}</option><option value="yes">{t('yes')}</option><option value="no">{t('no')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('q_mpasiStartDate')}</label>
            <input type="number" name="mpasiStartDate" value={stuntingData.mpasiStartDate} onChange={handleStuntingChange} className={inputClass} />
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700">{t('q_mpasiTexture')}</label>
            <input type="text" name="mpasiTexture" value={stuntingData.mpasiTexture} onChange={handleStuntingChange} placeholder={t('ph_mpasiTexture')} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('q_mpasiMenu')}</label>
            <div className="mt-2 space-y-2">
                <div>
                    <p className="font-medium text-xs text-gray-600">{t('proteinSources')}:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-2">
                        {proteinSources.map(item => (
                            <label key={item.value} className="flex items-center"><input type="checkbox" name="mpasiMenu" value={item.value} checked={stuntingData.mpasiMenu.includes(item.value)} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" /><span className="ml-2 text-sm text-gray-700">{t(item.labelKey as any)}</span></label>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="font-medium text-xs text-gray-600">{t('carbSources')}:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-2">
                        {carbSources024.map(item => (
                            <label key={item.value} className="flex items-center"><input type="checkbox" name="mpasiMenu" value={item.value} checked={stuntingData.mpasiMenu.includes(item.value)} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" /><span className="ml-2 text-sm text-gray-700">{t(item.labelKey as any)}</span></label>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="font-medium text-xs text-gray-600">{t('otherEssentials')}:</p>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-2">
                        {otherEssentials.map(item => (
                            <label key={item.value} className="flex items-center"><input type="checkbox" name="mpasiMenu" value={item.value} checked={stuntingData.mpasiMenu.includes(item.value)} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" /><span className="ml-2 text-sm text-gray-700">{t(item.labelKey as any)}</span></label>
                        ))}
                    </div>
                </div>
            </div>
          </div>
           <div>
            <LabelWithInfo text={t('q_sleepWithBottle')} info={t('info_sleepWithBottle')} />
            <select name="sleepWithBottle" value={stuntingData.sleepWithBottle} onChange={handleStuntingChange} className={inputClass}>
                <option value="">{t('select')}</option><option value="yes">{t('yes')}</option><option value="no">{t('no')}</option>
            </select>
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700">{t('q_snackFrequency_0_24')}</label>
            <input type="text" name="snackFrequency" value={stuntingData.snackFrequency} onChange={handleStuntingChange} placeholder={t('ph_snackFrequency')} className={inputClass} />
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700">{t('q_snackType')}</label>
            <input type="text" name="snackType" value={stuntingData.snackType} onChange={handleStuntingChange} placeholder={t('ph_snackType')} className={inputClass} />
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700">{t('q_sweetDrinkFrequency')}</label>
            <input type="text" name="sweetDrinkFrequency" value={stuntingData.sweetDrinkFrequency} onChange={handleStuntingChange} placeholder={t('ph_sweetDrinkFrequency')} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('q_gumCleaningStartDate')}</label>
            <input type="number" name="gumCleaningStartDate" value={stuntingData.gumCleaningStartDate} onChange={handleStuntingChange} className={inputClass} />
          </div>
           <div>
             <LabelWithInfo text={t('q_useSpecialToothpaste')} info={t('info_useSpecialToothpaste')} />
             <select name="useSpecialToothpaste" value={stuntingData.useSpecialToothpaste} onChange={handleStuntingChange} className={inputClass}>
                <option value="">{t('select')}</option><option value="yes">{t('yes')}</option><option value="no">{t('no')}</option>
            </select>
          </div>
        </div>
      );
    }
    if (stuntingData.ageGroup === '>24') {
      const name = patientData.name || (language === 'id' ? 'pasien' : 'the patient');
      
      let titleName = name;
      if (isAdult && patientData.name && language === 'id') {
          if (patientData.gender === 'Male') {
              titleName = `Saudara ${patientData.name}`;
          } else if (patientData.gender === 'Female') {
              titleName = `Saudari ${patientData.name}`;
          }
      }

      const replacements = { name: name, titleName: titleName };

      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-gray-800 border-b pb-1 pt-4">{t('nutritionalStatusAndHabits')}</h3>
           <div>
            <label className="block text-sm font-medium text-gray-700">{t(isAdult ? 'q_mainMealsPerDay_adult' : 'q_mainMealsPerDay', replacements)}</label>
            <input type="number" name="mainMealsPerDay" value={stuntingData.mainMealsPerDay} onChange={handleStuntingChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t(isAdult ? 'q_dailyDietIncludes_adult' : 'q_dailyDietIncludes', replacements)}</label>
            <div className="mt-2 space-y-2">
                <div>
                    <p className="font-medium text-xs text-gray-600">{t('proteinSources')}:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-2">
                        {proteinSources.map(item => (
                            <label key={item.value} className="flex items-center"><input type="checkbox" name="dailyDietIncludes" value={item.value} checked={stuntingData.dailyDietIncludes.includes(item.value)} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" /><span className="ml-2 text-sm text-gray-700">{t(item.labelKey as any)}</span></label>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="font-medium text-xs text-gray-600">{t('carbSources')}:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-2">
                         {carbSources24.map(item => (
                            <label key={item.value} className="flex items-center"><input type="checkbox" name="dailyDietIncludes" value={item.value} checked={stuntingData.dailyDietIncludes.includes(item.value)} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" /><span className="ml-2 text-sm text-gray-700">{t(item.labelKey as any)}</span></label>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="font-medium text-xs text-gray-600">{t('otherEssentials')}:</p>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-2">
                        {otherEssentials24.map(item => (
                            <label key={item.value} className="flex items-center"><input type="checkbox" name="dailyDietIncludes" value={item.value} checked={stuntingData.dailyDietIncludes.includes(item.value)} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" /><span className="ml-2 text-sm text-gray-700">{t(item.labelKey as any)}</span></label>
                        ))}
                    </div>
                </div>
            </div>
          </div>
           <div>
            <LabelWithInfo text={t(isAdult ? 'q_isPickyEater_adult' : 'q_isPickyEater', replacements)} info={t(isAdult ? 'info_isPickyEater_adult' : 'info_isPickyEater', replacements)} />
            <select name="isPickyEater" value={stuntingData.isPickyEater} onChange={handleStuntingChange} className={inputClass}>
                <option value="">{t('select')}</option><option value="yes">{t('yes')}</option><option value="no">{t('no')}</option>
            </select>
          </div>
          {stuntingData.isPickyEater === 'yes' && (
            <div>
                <label className="block text-sm font-medium text-gray-700">{t(isAdult ? 'q_pickyEaterFoods_adult' : 'q_pickyEaterFoods', replacements)}</label>
                <input type="text" name="pickyEaterFoods" value={stuntingData.pickyEaterFoods} onChange={handleStuntingChange} placeholder={t('ph_pickyEaterFoods')} className={inputClass} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">{t(isAdult ? 'q_snackFrequency_24_adult' : 'q_snackFrequency_24', replacements)}</label>
            <input type="text" name="snackFrequencyOutside" value={stuntingData.snackFrequencyOutside} onChange={handleStuntingChange} placeholder={t('ph_snackFrequency')} className={inputClass} />
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700">{t(isAdult ? 'q_favoriteSnack_adult' : 'q_favoriteSnack', replacements)}</label>
            <input type="text" name="favoriteSnack" value={stuntingData.favoriteSnack} onChange={handleStuntingChange} placeholder={t('ph_favoriteSnack')} className={inputClass} />
          </div>
          <div>
            <LabelWithInfo text={t(isAdult ? 'q_weeklyConsumption_soda_adult' : 'q_weeklyConsumption_soda', replacements)} info={t('info_weeklyConsumption_soda')} />
            <input type="text" name="weeklyConsumption.soda" value={stuntingData.weeklyConsumption.soda} onChange={handleNestedChange} placeholder={t('ph_weeklyConsumption')} className={inputClass} />
          </div>
           <div>
            <LabelWithInfo text={t(isAdult ? 'q_weeklyConsumption_packagedSnacks_adult' : 'q_weeklyConsumption_packagedSnacks', replacements)} info={t('info_weeklyConsumption_packagedSnacks')} />
            <input type="text" name="weeklyConsumption.packagedSnacks" value={stuntingData.weeklyConsumption.packagedSnacks} onChange={handleNestedChange} placeholder={t('ph_weeklyConsumption')} className={inputClass} />
          </div>
          <div>
             <LabelWithInfo text={t(isAdult ? 'q_weeklyConsumption_sweets_adult' : 'q_weeklyConsumption_sweets', replacements)} info={t('info_weeklyConsumption_sweets')} />
            <input type="text" name="weeklyConsumption.sweets" value={stuntingData.weeklyConsumption.sweets} onChange={handleNestedChange} placeholder={t('ph_weeklyConsumption')} className={inputClass} />
          </div>
           <div>
            <LabelWithInfo text={t(isAdult ? 'q_weeklyConsumption_fastFood_adult' : 'q_weeklyConsumption_fastFood', replacements)} info={t('info_weeklyConsumption_fastFood')} />
            <input type="text" name="weeklyConsumption.fastFood" value={stuntingData.weeklyConsumption.fastFood} onChange={handleNestedChange} placeholder={t('ph_weeklyConsumption')} className={inputClass} />
          </div>
          <div>
            <LabelWithInfo text={t(isAdult ? 'q_brushingFrequency_adult' : 'q_brushingFrequency', replacements)} info={t(isAdult ? 'info_brushingFrequency_adult' : 'info_brushingFrequency', replacements)} />
            <input type="number" name="brushingFrequency" value={stuntingData.brushingFrequency} onChange={handleStuntingChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('q_brushingHabits')}</label>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 pl-2">
                {brushingHabitsOptions.map(item => (
                    <label key={item.value} className="flex items-center"><input type="checkbox" name="brushingHabits" value={item.value} checked={stuntingData.brushingHabits.includes(item.value)} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" /><span className="ml-2 text-sm text-gray-700">{t(item.labelKey as any)}</span></label>
                ))}
            </div>
          </div>
           <div>
            <LabelWithInfo text={t(isAdult ? 'q_dentalPain_adult' : 'q_dentalPain', replacements)} info={t(isAdult ? 'info_dentalPain_adult' : 'info_dentalPain', replacements)} />
            <select name="dentalPain" value={stuntingData.dentalPain} onChange={handleStuntingChange} className={inputClass}>
                <option value="">{t('select')}</option><option value="yes">{t('yes')}</option><option value="no">{t('no')}</option>
            </select>
          </div>
        </div>
      );
    }
    return <p className="text-gray-500 text-center mt-4">{t('enterAgePrompt')}</p>;
  }

  return (
    <div className="w-full flex flex-col items-center">
       <h2 className="text-2xl font-bold text-gray-700 mb-1">{t('step1Title')}</h2>
       <p className="text-gray-500 mb-6">{t('step1Subtitle')}</p>
      <div className="w-full max-w-md space-y-4">
        
        <h3 className="font-semibold text-lg text-gray-800 border-b pb-1">{t('patientIdentity')}</h3>
        <div>
          <label htmlFor="nik" className="block text-sm font-medium text-gray-700">{t('nikLabel')}</label>
          <input type="text" name="nik" id="nik" value={patientData.nik} onChange={handlePatientChange} className={inputClass} />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('nameLabel')}</label>
          <input type="text" name="name" id="name" value={patientData.name} onChange={handlePatientChange} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="dob" className="block text-sm font-medium text-gray-700">{t('dobLabel')}</label>
                <input type="date" name="dob" id="dob" value={patientData.dob} onChange={handlePatientChange} className={inputClass} />
            </div>
            <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">{t('genderLabel')}</label>
                <select name="gender" id="gender" value={patientData.gender} onChange={handlePatientChange} className={inputClass}>
                    <option value="">{t('selectGender')}</option>
                    <option value="Male">{t('male')}</option>
                    <option value="Female">{t('female')}</option>
                </select>
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700">{t('weightLabel')}</label>
                <input type="number" name="weight" id="weight" value={patientData.weight} onChange={handlePatientChange} className={inputClass} />
            </div>
             <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700">{t('heightLabel')}</label>
                <input type="number" name="height" id="height" value={patientData.height} onChange={handlePatientChange} className={inputClass} />
            </div>
        </div>
        {!isOver5Years && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="headCircumference" className="block text-sm font-medium text-gray-700">{t('headCircumferenceLabel')}</label>
                    <input 
                        type="number" 
                        name="headCircumference" 
                        id="headCircumference" 
                        value={patientData.headCircumference} 
                        onChange={handlePatientChange}
                        className={inputClass}
                    />
                </div>
                <div>
                    <label htmlFor="armCircumference" className="block text-sm font-medium text-gray-700">{t('armCircumferenceLabel')}</label>
                    <input 
                        type="number" 
                        name="armCircumference" 
                        id="armCircumference" 
                        value={patientData.armCircumference} 
                        onChange={handlePatientChange} 
                        className={inputClass}
                    />
                </div>
            </div>
        )}

        {historyRecords.length > 1 && (
            <div className="pt-4 mt-4 border-t">
                <h3 className="font-semibold text-lg text-gray-800 mb-2">{t('patientHistory')}</h3>
                <PatientHistoryChart patientRecords={historyRecords} />
            </div>
        )}
        
        {renderQuestionnaire()}
      </div>
    </div>
  );
};

export default StuntingScreening;