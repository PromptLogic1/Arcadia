import { useSelector } from 'react-redux';
import { selectUserRole, selectPermissions, hasPermission } from '@/src/store/slices/authSlice';
import type { RootState } from '@/src/store';

export const useAuth = () => {
  const userRole = useSelector(selectUserRole);
  const permissions = useSelector(selectPermissions);

  const useCheckPermission = (permission: string) => {
    return useSelector((state: RootState) => hasPermission(state, permission));
  };

  return {
    userRole,
    permissions,
    checkPermission: useCheckPermission
  };
}; 