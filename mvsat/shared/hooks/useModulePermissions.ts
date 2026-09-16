import { useEffect, useState } from 'react';
import { hasPermissionForCurrentUser } from '../permissions';
import { getTipoFromSession } from '../saas/session';

export function useModulePermissions<T extends string>(module: string, actions: readonly T[]) {
  const [permissions, setPermissions] = useState<Record<T, boolean>>(() => {
    const isAdmin = getTipoFromSession() === 'admin';
    return Object.fromEntries(actions.map((action) => [action, isAdmin])) as Record<T, boolean>;
  });

  useEffect(() => {
    let active = true;
    Promise.all(actions.map((action) => hasPermissionForCurrentUser(module, action)))
      .then((values) => {
        if (active) setPermissions(Object.fromEntries(actions.map((action, index) => [action, values[index]])) as Record<T, boolean>);
      })
      .catch(() => {
        if (active && getTipoFromSession() !== 'admin') {
          setPermissions(Object.fromEntries(actions.map((action) => [action, false])) as Record<T, boolean>);
        }
      });
    return () => { active = false; };
  }, [module, actions.join('|')]);

  return permissions;
}
