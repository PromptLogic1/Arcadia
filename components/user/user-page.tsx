'use client'

import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectUserRole, selectUserId } from '@/src/store/selectors/authSelectors'

export function UserPage() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const userRole = useSelector(selectUserRole)
  const userId = useSelector(selectUserId)

  if (!isAuthenticated) {
    return <div>Please log in to view this page</div>
  }

  return (
    <div>
      <h1>User Profile</h1>
      <p>Role: {userRole}</p>
      <p>ID: {userId}</p>
    </div>
  )
}
