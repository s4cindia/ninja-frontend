import { useParams } from 'react-router-dom';
import ZoneReviewWorkspace from '../../components/bootstrap/ZoneReviewWorkspace';

export default function ZoneReviewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  if (!documentId) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Invalid document ID
      </div>
    );
  }
  return <ZoneReviewWorkspace documentId={documentId} runId="" />;
}
