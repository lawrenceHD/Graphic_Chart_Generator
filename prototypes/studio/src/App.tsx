import { Landing } from './screens/Landing';
import { Start } from './screens/Start';
import { Studio } from './screens/Studio';
import { useRoute } from './router';

export function App() {
  const [screen, slug] = useRoute();
  if (screen === 'studio') return <Studio slug={slug} />;
  if (screen === 'start') return <Start />;
  return <Landing />;
}
