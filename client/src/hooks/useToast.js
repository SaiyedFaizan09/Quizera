import { useCallback, useEffect, useRef, useState } from "react";

const useToast = (defaultDurationMs = 3500) => {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const clearToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message, type = "error", durationMs = defaultDurationMs) => {
      if (!message) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ message, type });
      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, durationMs);
    },
    [defaultDurationMs]
  );

  useEffect(() => () => clearToast(), [clearToast]);

  return { toast, showToast, clearToast };
};

export default useToast;
