// Keep snapshots and cursor in one pure transition: React may replay updaters.
export function updateConfigHistory(state, updater) {
  const current = state.history[state.index];
  const next = typeof updater === 'function' ? updater(current) : updater;
  if (JSON.stringify(current) === JSON.stringify(next)) return state;
  const history = [...state.history.slice(0,state.index+1),next].slice(-30);
  return {history,index:history.length-1};
}
