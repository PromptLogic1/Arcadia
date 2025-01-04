import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectgetAuthUser, selectgetUserRole } from '@/src/store/slices/authSlice';

export const useAuth = () => {
  const userRole = useSelector(selectgetUserRole);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authUser = useSelector(selectgetAuthUser);

  return {
    userRole,
    isAuthenticated,
    authUser
  };
}; 