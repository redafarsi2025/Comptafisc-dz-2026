
// src/components/approvals/ApprovalDashboard.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WorkflowInstance } from '@/models/workflow.models';
import { UserSelector } from './UserSelector'; // Pour simuler la connexion
import { TaskList } from './TaskList';
import { TaskDetails } from './TaskDetails';

const availableRoles = ['MANAGER', 'FINANCE_CONTROLLER', 'IT_DIRECTOR', 'CEO'];

/**
 * Le composant principal du tableau de bord des approbations.
 */
export function ApprovalDashboard() {
  const [currentUser, setCurrentUser] = useState(availableRoles[0]);
  const [tasks, setTasks] = useState<WorkflowInstance[]>([]);
  const [selectedTask, setSelectedTask] = useState<WorkflowInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenantId = 'tenant-123';

  const fetchTasks = useCallback(async (userId: string) => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/workflows/tasks', {
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': userId,
        },
      });
      if (!response.ok) throw new Error('Erreur lors du chargement des tâches.');
      const data = await response.json();
      setTasks(data);
    } catch (e: any) {
      setError(e.message);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTasks(currentUser);
    setSelectedTask(null); // Réinitialiser la sélection quand l'utilisateur change
  }, [currentUser, fetchTasks]);

  const handleTaskUpdate = () => {
    fetchTasks(currentUser); // Recharger les tâches après une action
    setSelectedTask(null); // Désélectionner la tâche traitée
  };

  return (
    <div className="space-y-6">
        <div>
            <UserSelector 
                roles={availableRoles} 
                selectedRole={currentUser} 
                onRoleChange={setCurrentUser} 
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 border rounded-lg shadow-sm bg-card h-fit">
                 <TaskList 
                    tasks={tasks}
                    isLoading={isLoading}
                    error={error}
                    selectedTaskId={selectedTask?.id || null}
                    onTaskSelect={setSelectedTask}
                />
            </div>
            <div className="md:col-span-2">
                {selectedTask ? (
                    <TaskDetails 
                        task={selectedTask} 
                        onTaskUpdate={handleTaskUpdate} 
                        currentUser={currentUser} 
                    />
                ) : (
                    <div className="flex items-center justify-center h-full p-8 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Sélectionnez une tâche pour voir les détails.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
