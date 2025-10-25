import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  const routerNavigate = useRouterNavigate();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [onSaveCallback, setOnSaveCallback] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const navigate = useCallback((path) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
      setShowUnsavedModal(true);
      return false;
    } else {
      routerNavigate(path);
      return true;
    }
  }, [hasUnsavedChanges, routerNavigate]);

  const proceedWithNavigation = useCallback(() => {
    if (pendingNavigation) {
      setHasUnsavedChanges(false);
      routerNavigate(pendingNavigation);
      setPendingNavigation(null);
      setShowUnsavedModal(false);
    }
  }, [pendingNavigation, routerNavigate]);

  const saveAndProceed = useCallback(async () => {
    if (onSaveCallback) {
      await onSaveCallback();
    }
    proceedWithNavigation();
  }, [onSaveCallback, proceedWithNavigation]);

  const cancelNavigation = useCallback(() => {
    setPendingNavigation(null);
    setShowUnsavedModal(false);
  }, []);

  const value = {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    navigate,
    showUnsavedModal,
    setShowUnsavedModal,
    pendingNavigation,
    proceedWithNavigation,
    saveAndProceed,
    cancelNavigation,
    setOnSaveCallback,
    routerNavigate
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
