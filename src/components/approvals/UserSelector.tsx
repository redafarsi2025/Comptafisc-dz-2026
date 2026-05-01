
// src/components/approvals/UserSelector.tsx
'use client';

import React from 'react';

interface UserSelectorProps {
  roles: string[];
  selectedRole: string;
  onRoleChange: (role: string) => void;
}

export function UserSelector({ roles, selectedRole, onRoleChange }: UserSelectorProps) {
  return (
    <div className="max-w-xs">
      <label htmlFor="user-selector" className="block text-sm font-medium text-gray-700 mb-1">
        Simuler la connexion en tant que :
      </label>
      <select
        id="user-selector"
        value={selectedRole}
        onChange={(e) => onRoleChange(e.target.value)}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
        {roles.map(role => (
          <option key={role} value={role}>{role}</option>
        ))}
      </select>
    </div>
  );
}
