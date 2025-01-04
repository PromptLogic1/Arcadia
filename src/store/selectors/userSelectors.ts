import { RootState } from '../index';

export const selectUserData = (state: RootState) => state.userdata.userdata;