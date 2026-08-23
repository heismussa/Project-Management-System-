import React from 'react';
import { useUsers, useUpdateUserRole } from '../hooks/useUsers';

export default function UserManagementPage() {
  const { data: users, isLoading, isError, error } = useUsers();
  const updateUserRole = useUpdateUserRole();

  const handleRoleChange = (userId, newRole) => {
    updateUserRole.mutate({ userId, role: newRole });
  };

  if (isLoading) {
    return <div className="p-6 text-gray-600">Loading system users...</div>;
  }

  if (isError) {
    return <div className="p-6 text-red-500">Error loading users: {error.message}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Current Role</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm text-gray-700">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition">
                <td className="p-4 font-medium text-gray-900">{u.name}</td>
                <td className="p-4">{u.email}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium capitalize">
                    {u.role || 'user'}
                  </span>
                </td>
                <td className="p-4">
                  <select
                    value={u.role || 'user'}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={updateUserRole.isPending}
                    className="border rounded-lg px-2.5 py-1 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="user">User</option>
                    <option value="ViewOnly">ViewOnly</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}