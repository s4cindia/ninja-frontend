import { useState } from 'react';
import { EditionSelector } from '@/components/acr/EditionSelector';
import type { AcrEdition } from '@/types/acr.types';

export function TestEditionSelector() {
  const [selected, setSelected] = useState<AcrEdition | null>(null);
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edition Selector Test</h1>
      <EditionSelector 
        selectedEdition={selected} 
        onSelect={setSelected} 
      />
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <p><strong>Selected Edition:</strong> {selected?.name || 'None'}</p>
        {selected && (
          <pre className="mt-2 text-sm text-gray-600 overflow-auto">
            {JSON.stringify(selected, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
