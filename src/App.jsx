import React from 'react';
import PivotWorkbench from './features/pivot/PivotWorkbench';

export default function App() {
  return (
    <div className="w-full min-h-[100dvh] md:h-[100dvh] overflow-x-hidden md:overflow-hidden print:h-auto print:overflow-visible">
      <PivotWorkbench />
    </div>
  );
}
