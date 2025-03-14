import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import App from './App';
import ErrorFallback from './components/ErrorFallback';
import { initAnalytics, trackError } from './lib/analytics';
import { initSentry } from './lib/sentry';
import reportWebVitals from './reportWebVitals';
import './assets/styles/main.scss';
import './i18n';
import { registerServiceWorker } from './serviceWorker';
import { PerformanceMetrics } from './components/Performance';
import { FocusManager } from './components/Accessibility';
import { EnvironmentBanner } from './components/Environment';

// Initialize error tracking and performance monitoring
initSentry();
initAnalytics();

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry 404s or 401s
        if ([404, 401].includes(error?.status)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: process.env.NODE_ENV === 'production',
      useErrorBoundary: true,
    },
    mutations: {
      useErrorBoundary: true,
    }
  }
});

// Create root instance
const root = ReactDOM.createRoot(document.getElementById('root'));

// Lazy load devtools to reduce production bundle size
const LazyReactQueryDevtools = React.lazy(() =>
  import('@tanstack/react-query-devtools').then((d) => ({
    default: d.ReactQueryDevtools,
  }))
);

root.render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        trackError(error, info);
        console.error('Application Error:', error, info);
      }}
      onReset={() => window.location.replace('/')}
    >
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <HelmetProvider>
                <NotificationProvider>
                  <PerformanceMetrics>
                    <FocusManager>
                      <EnvironmentBanner />
                      <Suspense fallback={<div className="loading-overlay" />}>
                        <App />
                        {process.env.NODE_ENV === 'development' && (
                          <Suspense fallback={null}>
                            <LazyReactQueryDevtools
                              position="bottom-right"
                              toggleButtonProps={{ style: { bottom: '4rem' } }}
                            />
                          </Suspense>
                        )}
                      </Suspense>
                    </FocusManager>
                  </PerformanceMetrics>
                </NotificationProvider>
              </HelmetProvider>
            </QueryClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  </React.StrictMode>
);

// Service Worker Registration
if (process.env.NODE_ENV === 'production') {
  registerServiceWorker({
    onUpdate: (registration) => {
      if (registration.waiting) {
        window.dispatchEvent(new Event('serviceWorkerUpdate'));
      }
    },
    onSuccess: () => {
      console.log('Service Worker: Registered');
    },
    onError: (error) => {
      console.error('Service Worker registration failed:', error);
    }
  });
}

// Web Vitals Reporting
if (process.env.NODE_ENV === 'production') {
  reportWebVitals((metric) => {
    const { name, value } = metric;
    window.analytics.track('Web Vitals', {
      metricName: name,
      metricValue: Math.round(name === 'CLS' ? value * 1000 : value),
    });
  });
}

// Critical Error Handling
window.addEventListener('error', (event) => {
  trackError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  trackError(event.reason);
});