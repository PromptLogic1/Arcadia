import { useSelector } from 'react-redux';
import { selectUserState, selectUserRole, selectPermissions, hasPermission } from '@/src/store/slices/authSlice';
import type { RootState } from '@/src/store';

export const useAuth = () => {
  const userState = useSelector(selectUserState);
  const userRole = useSelector(selectUserRole);
  const permissions = useSelector(selectPermissions);

  const useCheckPermission = (permission: string) => {
    return useSelector((state: RootState) => hasPermission(state, permission));
  };

  return {
    isGuest: userState === 'GUEST',
    isAuthenticated: userState === 'AUTHENTICATED',
    userRole,
    permissions,
    checkPermission: useCheckPermission
  };
}; 