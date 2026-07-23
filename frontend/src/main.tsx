import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './app/App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,         // 30 seconds
      gcTime: 5 * 60_000,       // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if ((error as { statusCode?: number })?.statusCode === 404) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'Inter, ui-sans-serif',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#f8fafc' } },
            error:   { iconTheme: { primary: '#f43f5e', secondary: '#f8fafc' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
