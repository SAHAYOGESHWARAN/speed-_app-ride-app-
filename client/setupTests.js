
import '@testing-library/jest-dom/extend-expect';
import { render, screen, act } from '@testing-library/react';
import { RouterContext } from 'next/dist/shared/lib/router-context';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import userEvent from '@testing-library/user-event';

// Suppress React 18 act() warnings globally
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (/Warning: ReactDOM.render is no longer supported in React 18/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock Next.js router
const mockRouter = {
  basePath: '',
  pathname: '/',
  route: '/',
  asPath: '/',
  query: {},
  push: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  beforePopState: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isFallback: false,
};

// Mock Service Worker setup
export const server = setupServer(
  rest.get('/api/*', (req, res, ctx) => res(ctx.status(200), ctx.json({}))),
  rest.post('/api/*', (req, res, ctx) => res(ctx.status(200), ctx.json({}))),
);

// Establish API mocking before all tests
beforeAll(() => server.listen({
  onUnhandledRequest: 'warn',
}));

// Reset any request handlers between tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

// Custom render method with providers
const customRender = (ui, options = {}) => {
  const { route = '/', ...renderOptions } = options;
  window.history.pushState({}, 'Test page', route);

  const testQueryClient = createTestQueryClient();

  const Wrapper = ({ children }) => (
    <RouterContext.Provider value={mockRouter}>
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </RouterContext.Provider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render, screen, act, userEvent };

// Custom query shortcuts
export const queries = {
  button: (name) => screen.getByRole('button', { name }),
  form: (name) => screen.getByRole('form', { name }),
  link: (name) => screen.getByRole('link', { name }),
  heading: (level) => screen.getByRole('heading', { level }),
  input: (name) => screen.getByRole('textbox', { name }),
};

// Mock authentication state
export const mockSession = (overrides = {}) => ({
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
  },
  expires: new Date(Date.now() + 3600 * 1000).toISOString(),
  ...overrides,
});

// Mock Next.js useSession hook
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession(), status: 'authenticated' }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));