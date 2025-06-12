import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const manifestUrl = process.env.NODE_ENV === 'production' 
  ? 'https://aegisum.co.za/webapp/tonconnect-manifest.json'
  : '/tonconnect-manifest.json';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--tg-theme-bg-color, #1a1a1a)',
              color: 'var(--tg-theme-text-color, #ffffff)',
              border: '1px solid rgba(30, 144, 255, 0.3)',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </QueryClientProvider>
    </TonConnectUIProvider>
  </React.StrictMode>
);