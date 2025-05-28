import dynamic from 'next/dynamic';

// Dynamically import the UserPageEdit component
const UserPageEdit = dynamic(
  () => import('@/src/features/user/components/user-page-edit'),
  { 
    loading: () => <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>
  }
);

export default function EditProfilePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <UserPageEdit />
    </div>
  );
}
