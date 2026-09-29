import { useRouter } from '@/lib/router';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { Workspace } from '@/pages/Workspace';
import { MemoryPanel } from '@/pages/MemoryPanel';
import { LearningInsights } from '@/pages/LearningInsights';
import { ExperienceHistory } from '@/pages/ExperienceHistory';

function App() {
  const { route, navigate } = useRouter();

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Background gradient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-sky-500/5 blur-[120px]" />
      </div>

      <Sidebar route={route} navigate={navigate} />

      <main className="flex-1 relative min-w-0">
        {route.name === 'dashboard' && <Dashboard navigate={navigate} />}
        {route.name === 'workspace' && (
          <Workspace navigate={navigate} experienceId={'experienceId' in route ? route.experienceId : undefined} />
        )}
        {route.name === 'experiences' && <ExperienceHistory navigate={navigate} />}
        {route.name === 'memory' && <MemoryPanel navigate={navigate} />}
        {route.name === 'learning' && <LearningInsights navigate={navigate} />}
      </main>
    </div>
  );
}

export default App;
