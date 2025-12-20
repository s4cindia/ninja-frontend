import React, { useState } from 'react';
import { LongDescriptionEditor, LongDescriptionIndicator } from '@/components/alt-text/LongDescriptionEditor';
import { LongDescription } from '@/types/alt-text.types';

const sampleDescription: LongDescription = {
  id: 'ld-001',
  imageId: 'img-001',
  jobId: 'job-001',
  altTextId: 'alt-001',
  trigger: 'COMPLEX_CHART',
  content: {
    plainText: `This bar chart displays quarterly sales performance across four geographical regions: North, South, East, and West for the fiscal year 2024.

The vertical axis represents revenue in millions of dollars, ranging from 0 to 25 million. The horizontal axis shows the four quarters: Q1, Q2, Q3, and Q4.

Each quarter contains four grouped bars, color-coded by region:
- Blue: North region
- Green: South region  
- Orange: East region
- Purple: West region

Key observations:
- The North region consistently outperforms other regions across all quarters
- Q4 shows the highest overall sales across all regions
- There is a clear upward trend from Q1 to Q4
- The West region shows the fastest growth rate despite starting with the lowest Q1 numbers`,
    markdown: `# Quarterly Sales Performance Chart

This bar chart displays **quarterly sales performance** across four geographical regions for FY 2024.

## Axis Information
- **Y-axis**: Revenue in millions ($0-$25M)
- **X-axis**: Quarters (Q1-Q4)

## Regional Color Coding
- 🔵 Blue: North region
- 🟢 Green: South region
- 🟠 Orange: East region
- 🟣 Purple: West region

## Key Observations
1. North region consistently leads
2. Q4 shows highest overall sales
3. Clear upward trend throughout the year
4. West region shows fastest growth rate`,
    html: `<h2>Quarterly Sales Performance Chart</h2>
<p>This bar chart displays <strong>quarterly sales performance</strong> across four geographical regions for FY 2024.</p>

<h3>Axis Information</h3>
<ul>
  <li><strong>Y-axis</strong>: Revenue in millions ($0-$25M)</li>
  <li><strong>X-axis</strong>: Quarters (Q1-Q4)</li>
</ul>

<h3>Regional Color Coding</h3>
<ul>
  <li>Blue: North region</li>
  <li>Green: South region</li>
  <li>Orange: East region</li>
  <li>Purple: West region</li>
</ul>

<h3>Key Observations</h3>
<ol>
  <li>North region consistently leads</li>
  <li>Q4 shows highest overall sales</li>
  <li>Clear upward trend throughout the year</li>
  <li>West region shows fastest growth rate</li>
</ol>`,
  },
  wordCount: 156,
  sections: [
    { heading: 'Overview', content: 'Bar chart showing quarterly sales across four regions for FY 2024.' },
    { heading: 'Data Structure', content: 'Four grouped bars per quarter, color-coded by region.' },
    { heading: 'Key Findings', content: 'North leads consistently; Q4 is strongest quarter; West shows fastest growth.' },
  ],
  status: 'pending',
  aiModel: 'gemini-1.5-pro',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const TestLongDescriptionEditor: React.FC = () => {
  const [description, setDescription] = useState<LongDescription | undefined>(sampleDescription);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const handleSave = async (content: { plainText: string; markdown: string; html: string }) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setDescription(prev => prev ? {
      ...prev,
      content,
      status: 'edited',
      wordCount: content.plainText.split(/\s+/).filter(w => w.length > 0).length,
    } : undefined);
    console.log('Saved:', content);
  };

  const handleApprove = async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setDescription(prev => prev ? { ...prev, status: 'approved' } : undefined);
    console.log('Approved');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setDescription(sampleDescription);
    setIsGenerating(false);
    setShowEmpty(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Long Description Editor Test</h1>
        <p className="text-gray-600">
          Edit extended descriptions for complex images with aria-describedby support.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setShowEmpty(true); setDescription(undefined); }}
          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          Show Empty State
        </button>
        <button
          onClick={() => { setShowEmpty(false); setDescription(sampleDescription); }}
          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          Show With Description
        </button>
        <button
          onClick={() => setDescription(prev => prev ? { ...prev, status: 'pending' } : undefined)}
          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          Reset Status
        </button>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Indicator Badges</h2>
        <div className="flex gap-3">
          <LongDescriptionIndicator needed={true} exists={false} onClick={() => console.log('Generate')} />
          <LongDescriptionIndicator needed={true} exists={true} status="pending" onClick={() => console.log('View')} />
          <LongDescriptionIndicator needed={true} exists={true} status="approved" onClick={() => console.log('View approved')} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Editor</h2>
        <LongDescriptionEditor
          description={showEmpty ? undefined : description}
          shortAlt="Bar chart showing quarterly sales performance across four regions"
          imageId="img-001"
          imageUrl="https://quickchart.io/chart?c={type:'bar',data:{labels:['Q1','Q2','Q3','Q4'],datasets:[{label:'North',data:[12,15,18,22]},{label:'South',data:[8,11,14,17]}]}}"
          onSave={handleSave}
          onApprove={handleApprove}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Read Only Mode</h2>
        <LongDescriptionEditor
          description={{ ...sampleDescription, status: 'approved' }}
          shortAlt="Bar chart showing quarterly sales"
          imageId="img-002"
          readOnly={true}
        />
      </section>
    </div>
  );
};
