import { Navigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ThroughputTab } from '@/components/reports/ThroughputTab';
import { TeamActivityTab } from '@/components/reports/TeamActivityTab';
import { CostTab } from '@/components/reports/CostTab';
import { ReliabilityTab } from '@/components/reports/ReliabilityTab';

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
      <BarChart3 className="w-10 h-10 mb-3 text-gray-300" />
      <p className="font-medium">{label} reports are coming soon.</p>
    </div>
  );
}

export default function AdminReportsPage() {
  const { user: currentUser } = useAuthStore();

  if (currentUser?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Operational Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Internal throughput, cost, quality, reliability, and team-activity reporting —
          distinct from the PAC/ACR/VPAT compliance reports.
        </p>
      </div>

      <Tabs defaultValue="throughput">
        <TabsList>
          <TabsTrigger value="throughput">Throughput</TabsTrigger>
          <TabsTrigger value="cost">Cost</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="reliability">Reliability</TabsTrigger>
          <TabsTrigger value="team-activity">Team Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="throughput">
          <ThroughputTab />
        </TabsContent>
        <TabsContent value="cost">
          <CostTab />
        </TabsContent>
        <TabsContent value="quality">
          <ComingSoon label="Fix quality / effectiveness" />
        </TabsContent>
        <TabsContent value="reliability">
          <ReliabilityTab />
        </TabsContent>
        <TabsContent value="team-activity">
          <TeamActivityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
