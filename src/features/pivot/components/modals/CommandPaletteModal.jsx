import React from 'react';
import { Search, X } from 'lucide-react';

export function CommandPaletteModal({
  isOpen,
  onClose,
  commandQuery,
  setCommandQuery,
  commandActions,
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-start justify-center pt-24 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden animate-apple-modal flex flex-col max-h-[70vh]"
      >
        <div className="p-3 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[#66D9EF]" />
          <input
            autoFocus
            type="text"
            value={commandQuery}
            onChange={(e) => setCommandQuery(e.target.value)}
            placeholder="输入指令名称、图表类型或分镜动作..."
            className="flex-1 bg-transparent border-none text-xs apple-font-mono focus:outline-none text-[#272822] dark:text-[#F8F8F2]"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[9px] font-semibold text-[#75715E] apple-font-mono">ESC</kbd>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {commandActions.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#75715E] apple-font-mono">未找到匹配的快捷指令</div>
          ) : (
            commandActions.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.run();
                  onClose();
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-[#EFECE1] dark:hover:bg-[#1E1F1C] flex items-center justify-between gap-3 text-xs apple-font-mono transition group"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-[#272822] dark:text-[#F8F8F2] truncate group-hover:text-[#F92672] transition-colors">{cmd.label}</div>
                  <div className="text-[10px] text-[#75715E] dark:text-[#908E80]">{cmd.category}</div>
                </div>
                {cmd.shortcut && (
                  <kbd className="px-2 py-0.5 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px] font-bold text-[#A6E22E] shrink-0">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
