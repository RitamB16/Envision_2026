import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TeammateData {
  name: string;
  email: string;
  phone?: string;
  college?: string;
  food_preference?: string;
}

export interface PipelineState {
  step: 'EVENTS' | 'FORM' | 'CHECKOUT' | 'SUCCESS';
  eventId?: string;
  eventName?: string;
  registrationId?: string;
  razorpayOrderId?: string;
  amount?: number;
  isFree?: boolean;
  phone?: string;
  userName?: string;
  userEmail?: string;
  college?: string;
  foodPref?: string;
  teamName?: string;
  teammates?: TeammateData[];
}

interface RegistrationContextType {
  state: PipelineState;
  setStep: (step: 'EVENTS' | 'FORM' | 'CHECKOUT' | 'SUCCESS') => void;
  updateRegistrationData: (data: Partial<PipelineState>) => void;
  clearRegistrationData: () => void;
  isValidCheckoutAccess: () => boolean;
}

const STORAGE_KEY = 'envision_registration_pipeline_state';

const initialPipelineState: PipelineState = {
  step: 'EVENTS',
};

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PipelineState>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : initialPipelineState;
    } catch {
      return initialPipelineState;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not persist registration state to sessionStorage:', e);
    }
  }, [state]);

  const setStep = (step: 'EVENTS' | 'FORM' | 'CHECKOUT' | 'SUCCESS') => {
    setState((prev) => ({ ...prev, step }));
  };

  const updateRegistrationData = (data: Partial<PipelineState>) => {
    setState((prev) => ({ ...prev, ...data }));
  };

  const clearRegistrationData = () => {
    setState(initialPipelineState);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const isValidCheckoutAccess = (): boolean => {
    return !!(state.registrationId || state.razorpayOrderId);
  };

  return (
    <RegistrationContext.Provider
      value={{
        state,
        setStep,
        updateRegistrationData,
        clearRegistrationData,
        isValidCheckoutAccess,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistrationContext = (): RegistrationContextType => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistrationContext must be used within a RegistrationProvider');
  }
  return context;
};
