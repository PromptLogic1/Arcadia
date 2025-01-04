import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthUser, selectUserRole, selectUserData } from '@/src/store/selectors/authSelectors';

export const useAuth = () => {
  const userRole = useSelector(selectUserRole);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authUser = useSelector(selectAuthUser);
  const userData = useSelector(selectUserData);

  return {
    userRole,
    isAuthenticated,
    authUser,
    userData
  };
}; 