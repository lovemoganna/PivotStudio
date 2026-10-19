import React from 'react';
import PivotWorkbench from './features/pivot/PivotWorkbench';

export default function App() {
  return (
    <div className="w-full h-screen overflow-hidden print:h-auto print:overflow-visible">
      <PivotWorkbench />
    </div>
  );
}
