import React, { createContext, useContext, useState } from 'react';

interface JobContextType {
  fetchingWorks: boolean;
  setFetchingWorks: (val: boolean) => void;
  fetchingProgress: { message: string; error?: string } | null;
  setFetchingProgress: React.Dispatch<React.SetStateAction<{ message: string; error?: string } | null>>;
  reinterpretingId: string | null;
  setReinterpretingId: (val: string | null) => void;
  reinterpretMessages: Record<string, string>;
  setReinterpretMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const JobContext = createContext<JobContextType | null>(null);

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [fetchingWorks, setFetchingWorks] = useState(false);
  const [fetchingProgress, setFetchingProgress] = useState<{message: string, error?: string} | null>(null);
  const [reinterpretingId, setReinterpretingId] = useState<string | null>(null);
  const [reinterpretMessages, setReinterpretMessages] = useState<Record<string, string>>({});

  return (
    <JobContext.Provider value={{
      fetchingWorks, setFetchingWorks,
      fetchingProgress, setFetchingProgress,
      reinterpretingId, setReinterpretingId,
      reinterpretMessages, setReinterpretMessages
    }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobs() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error("useJobs must be used within JobProvider");
  return ctx;
}
