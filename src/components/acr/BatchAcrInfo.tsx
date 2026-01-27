import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FileText } from 'lucide-react';

interface BatchInfo {
  isBatch: boolean;
  totalDocuments: number;
  documentList: Array<{
    fileName: string;
    jobId: string;
  }>;
  aggregationStrategy: 'conservative' | 'optimistic';
  sourceJobIds: string[];
}

interface ProductInfo {
  name: string;
  vendor: string;
  contactEmail: string;
  edition: string;
}

interface BatchAcrInfoProps {
  batchInfo: BatchInfo;
  productInfo: ProductInfo;
}

export function BatchAcrInfo({ batchInfo, productInfo }: BatchAcrInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch ACR Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Batch Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{productInfo.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Vendor</dt>
            <dd className="mt-1 text-sm text-gray-900">{productInfo.vendor}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Contact Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{productInfo.contactEmail}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">VPAT Edition</dt>
            <dd className="mt-1 text-sm text-gray-900">{productInfo.edition}</dd>
          </div>
        </dl>

        <div className="border-t pt-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Documents</dt>
              <dd className="mt-1 text-sm text-gray-900">{batchInfo.totalDocuments}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Aggregation Strategy</dt>
              <dd className="mt-1">
                <Badge variant={batchInfo.aggregationStrategy === 'conservative' ? 'default' : 'warning'}>
                  {batchInfo.aggregationStrategy === 'conservative' ? 'Conservative' : 'Optimistic'}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Documents Included ({batchInfo.documentList.length})
          </h4>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {batchInfo.documentList.map((doc, index) => (
              <li key={doc.jobId} className="flex items-center text-sm text-gray-700">
                <FileText className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                <span className="text-gray-500 mr-2">{index + 1}.</span>
                <span className="truncate" title={doc.fileName}>{doc.fileName}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
