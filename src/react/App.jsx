import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/Shell.jsx';
import { Dashboard } from './routes/Dashboard.jsx';
import { Today } from './routes/Today.jsx';
import { Inbox } from './routes/Inbox.jsx';
import { Lijsten } from './routes/Lijsten.jsx';
import { Planning } from './routes/Planning.jsx';
import { Projects } from './routes/Projects.jsx';
import { ProjectDetail } from './routes/ProjectDetail.jsx';
import { Settings } from './routes/Settings.jsx';
import { ModeProvider } from './hooks/useMode.jsx';
import { EventBusProvider } from './hooks/useEventBus.jsx';
import { BlockRegistryProvider } from './hooks/useBlockRegistry.jsx';

export function App({ eventBus, modeManager, blockRegistry }) {
  return (
    <EventBusProvider eventBus={eventBus}>
      <ModeProvider modeManager={modeManager}>
        <BlockRegistryProvider blockRegistry={blockRegistry}>
        <HashRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Navigate to="/today" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="today" element={<Today />} />
              <Route path="inbox" element={<Inbox />} />
              <Route path="lijsten" element={<Lijsten />} />
              <Route path="planning" element={<Planning />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/today" replace />} />
            </Route>
          </Routes>
        </HashRouter>
        </BlockRegistryProvider>
      </ModeProvider>
    </EventBusProvider>
  );
}
