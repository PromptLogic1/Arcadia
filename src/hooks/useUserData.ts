import { useSelector } from 'react-redux';
import { selectuserdata } from '@/src/store/slices/userDataSlice';

export const useUserData = () => {
  const user = useSelector(selectuserdata);

  return {
    user,
    isUserLoaded: !!user
  };
};
