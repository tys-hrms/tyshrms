import React, { useState } from 'react';
import WorkforceFAB from './WorkforceFAB';
import FloatingCalculator from '../FloatingCalculator';
import AIAssistant from '../AIAssistant';
import { useRBAC } from '../../contexts/RBACContext';
import { useAuth } from '../../contexts/AuthContext';

export default function ActionCluster() {
  const { session } = useAuth();
  const { can, hasFeature } = useRBAC();
  const role = session.currentUser?.role || 'Worker';

  // We only show the cluster if the user is authenticated
  if (!session.currentUser) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none">
       {/* 
          We wrap the individual components. 
          To fix the 'moved icons' issue, we ensure they are part of a single vertical stack.
          We'll also modify the individual components to remove their own fixed positioning 
          and instead be part of this flex container.
       */}
       <div className="flex flex-col items-end gap-3 pointer-events-auto">
          {hasFeature(role, 'calculatorAllowed') && <FloatingCalculator />}
          {hasFeature(role, 'aiAssistantAllowed') && <AIAssistant />}
          <WorkforceFAB />
       </div>
    </div>
  );
}
