import React from 'react';
import { ChartDescriptionViewer, ChartDescriptionBadge } from '@/components/alt-text/ChartDescriptionViewer';
import { ChartDescription, AltTextFlag } from '@/types/alt-text.types';

const sampleDescriptions: ChartDescription[] = [
  {
    imageId: 'chart-1',
    imageType: 'BAR_CHART',
    shortAlt: 'Bar chart showing quarterly sales performance across four regions',
    longDescription: 'A vertical bar chart comparing sales performance across North, South, East, and West regions for Q1-Q4 2024. The chart uses color-coded bars with North in blue, South in green, East in orange, and West in purple. The y-axis shows revenue in millions of dollars, ranging from 0 to 25M. The x-axis shows the four quarters. Notable observations include the North region consistently outperforming others, with Q4 showing the highest overall sales across all regions.',
    confidence: 92,
    flags: ['DATA_VISUALIZATION', 'DATA_EXTRACTED'] as AltTextFlag[],
    aiModel: 'gemini-1.5-pro',
    generatedAt: new Date().toISOString(),
    dataTable: [
      { label: 'Q1', values: [12, 8, 10, 7] },
      { label: 'Q2', values: [15, 11, 12, 9] },
      { label: 'Q3', values: [18, 14, 13, 11] },
      { label: 'Q4', values: [22, 17, 16, 14] },
    ],
    trends: [
      'Steady growth across all regions throughout the year',
      'North region consistently leads in sales',
      'Q4 shows strongest performance across all regions',
    ],
    keyFindings: [
      'North region accounts for 35% of total annual sales',
      'Year-over-year growth averages 18% across regions',
      'West region shows fastest growth rate at 25%',
    ],
  },
  {
    imageId: 'chart-2',
    imageType: 'PIE_CHART',
    shortAlt: 'Pie chart showing market share distribution among top 5 competitors',
    longDescription: 'A pie chart displaying market share percentages for the top 5 companies in the industry. Company A holds the largest share at 35% (blue), followed by Company B at 25% (green), Company C at 20% (orange), Company D at 12% (purple), and Others at 8% (gray).',
    confidence: 88,
    flags: ['DATA_VISUALIZATION', 'DATA_EXTRACTED'] as AltTextFlag[],
    aiModel: 'gemini-1.5-pro',
    generatedAt: new Date().toISOString(),
    dataTable: [
      { label: 'Company A', values: [35] },
      { label: 'Company B', values: [25] },
      { label: 'Company C', values: [20] },
      { label: 'Company D', values: [12] },
      { label: 'Others', values: [8] },
    ],
    keyFindings: [
      'Top 2 companies control 60% of the market',
      'Long tail of smaller competitors in "Others" category',
    ],
  },
  {
    imageId: 'chart-3',
    imageType: 'FLOWCHART',
    shortAlt: 'Flowchart showing the document approval workflow with decision points',
    longDescription: 'A process flowchart illustrating the document approval workflow. The process begins with "Submit Document", flows to "Initial Review" performed by the team lead. A decision diamond asks "Meets Standards?" - if No, the flow goes to "Request Revisions" which loops back to the submitter. If Yes, it proceeds to "Manager Approval", another decision point for "Approved?" - if No, returns to revisions, if Yes, continues to "Final Processing" and ends at "Document Published".',
    confidence: 85,
    flags: ['DATA_VISUALIZATION', 'COMPLEX_IMAGE'] as AltTextFlag[],
    aiModel: 'gemini-1.5-pro',
    generatedAt: new Date().toISOString(),
    keyFindings: [
      '6 steps in the main approval path',
      '2 decision points with revision loops',
      'Minimum 3 stakeholders involved in the process',
    ],
  },
  {
    imageId: 'chart-4',
    imageType: 'LINE_CHART',
    shortAlt: 'Line chart showing website traffic trends over 12 months',
    longDescription: 'A line chart tracking monthly website visitors from January to December 2024. The chart shows three lines: total visitors (blue), unique visitors (green), and returning visitors (orange). All metrics show an upward trend with a notable spike in November due to a marketing campaign.',
    confidence: 78,
    flags: ['DATA_VISUALIZATION', 'DATA_EXTRACTED'] as AltTextFlag[],
    aiModel: 'gemini-1.5-pro',
    generatedAt: new Date().toISOString(),
    dataTable: [
      { label: 'Jan', values: [45000, 38000, 7000] },
      { label: 'Jun', values: [62000, 51000, 11000] },
      { label: 'Nov', values: [95000, 72000, 23000] },
      { label: 'Dec', values: [88000, 68000, 20000] },
    ],
    trends: [
      'Consistent month-over-month growth averaging 8%',
      'November spike of 45% due to marketing campaign',
      'Returning visitor ratio improving over time',
    ],
  },
  {
    imageId: 'img-5',
    imageType: 'PHOTO',
    shortAlt: 'Team members collaborating in a modern office meeting room',
    longDescription: 'A photograph showing five team members gathered around a conference table in a bright, modern office space. Natural light streams through large windows. Participants have laptops and notebooks, engaged in what appears to be a brainstorming session.',
    confidence: 72,
    flags: ['FACE_DETECTED'] as AltTextFlag[],
    aiModel: 'gemini-1.5-pro',
    generatedAt: new Date().toISOString(),
  },
];

export const TestChartDescriptionViewer: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Chart Description Viewer Test</h1>
        <p className="text-gray-600">
          Display specialized descriptions for charts, diagrams, and data visualizations.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Compact Badges</h2>
        <div className="flex flex-wrap gap-2">
          {sampleDescriptions.map((desc) => (
            <ChartDescriptionBadge
              key={desc.imageId}
              imageType={desc.imageType}
              confidence={desc.confidence}
              hasData={!!desc.dataTable?.length}
              onClick={() => console.log('Clicked:', desc.imageType)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Full Viewers</h2>
        {sampleDescriptions.map((desc, index) => (
          <ChartDescriptionViewer
            key={desc.imageId}
            description={desc}
            imageUrl={`https://picsum.photos/seed/${desc.imageId}/400/250`}
            expandedByDefault={index === 0}
          />
        ))}
      </section>
    </div>
  );
};
