import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'workspace'; experienceId?: string }
  | { name: 'experiences' }
  | { name: 'memory' }
  | { name: 'learning' };

function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const parts = clean.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'dashboard' };

  if (parts[0] === 'workspace') {
    if (parts[1]) return { name: 'workspace', experienceId: parts[1] };
    return { name: 'workspace' };
  }
  if (parts[0] === 'experiences') return { name: 'experiences' };
  if (parts[0] === 'memory') return { name: 'memory' };
  if (parts[0] === 'learning') return { name: 'learning' };

  return { name: 'dashboard' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'dashboard':
      return '#/';
    case 'workspace':
      return route.experienceId ? `#/workspace/${route.experienceId}` : '#/workspace';
    case 'experiences':
      return '#/experiences';
    case 'memory':
      return '#/memory';
    case 'learning':
      return '#/learning';
  }
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handler = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((target: Route) => {
    window.location.hash = routeToHash(target);
  }, []);

  return { route, navigate };
}
