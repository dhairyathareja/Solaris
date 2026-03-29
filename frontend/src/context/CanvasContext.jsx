/* File overview: frontend/src/context/CanvasContext.jsx
 * Purpose: shared canvas animation state used across visual components.
 */
import { createContext, useContext, useState } from 'react';

const CanvasContext = createContext();

export function CanvasProvider({ children }) {
  const [pulseSpeed, setPulseSpeed] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <CanvasContext.Provider value={{ pulseSpeed, setPulseSpeed, isProcessing, setIsProcessing }}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  return useContext(CanvasContext);
}