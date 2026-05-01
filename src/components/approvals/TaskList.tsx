
// src/components/approvals/TaskList.tsx
'use client';

import React from 'react';
import { WorkflowInstance } from '@/models/workflow.models';

interface TaskListProps {
  tasks: WorkflowInstance[];
  isLoading: boolean;
  error: string | null;
  selectedTaskId: string | null;
  onTaskSelect: (task: WorkflowInstance) => void;
}

export function TaskList({ tasks, isLoading, error, selectedTaskId, onTaskSelect }: TaskListProps) {

    if (isLoading) {
        return <div className="p-4 text-center">Chargement...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">{error}</div>;
    }

    if (tasks.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">Aucune tâche en attente.</div>;
    }

    return (
        <ul className="divide-y divide-border">
            {tasks.map(task => (
                <li key={task.id}>
                    <button 
                        onClick={() => onTaskSelect(task)}
                        className={`w-full text-left p-4 hover:bg-muted/50 ${selectedTaskId === task.id ? 'bg-muted/80' : ''}`}
                    >
                        <p className="font-semibold">{task.context.name}</p>
                        <p className="text-sm text-muted-foreground">Montant: {task.context.amount} €</p>
                        <p className="text-xs text-muted-foreground mt-1">ID: {task.id}</p>
                    </button>
                </li>
            ))}
        </ul>
    );
}
