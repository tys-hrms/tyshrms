import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AssignmentManager from './assignments/AssignmentManager';
import WorkerTaskView from './assignments/WorkerTaskView';

export default function AssignmentsPage() {
  const { session } = useAuth();
  const role = session.currentUser?.role || 'Worker';

  // Admins and Managers see the Assignment Manager (assigning tasks to others + board)
  if (role === 'Admin' || role === 'Manager') {
    return <AssignmentManager />;
  }

  // Workers see their own Task View
  return <WorkerTaskView />;
}
