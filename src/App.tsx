import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Ninja Platform
              </h1>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Welcome to Ninja Platform</h2>
              <p className="text-gray-600">
                Accessibility validation and compliance checking for educational publishers.
              </p>
              <div className="mt-4 p-4 bg-green-50 rounded-md">
                <p className="text-green-700">Frontend is running successfully!</p>
              </div>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
