import { t } from '../../../../i18n.js';
import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';

export function CommandPaletteModal({
  isOpen,
  onClose,
  commandQuery,
  setCommandQuery,
  commandActions,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef([]);
  const dialogRef = useDialogFocus(isOpen, onClose);

  useEffect(() => {
    setSelectedIndex(0);
  }, [commandQuery, isOpen]);

  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (commandActions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % commandActions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + commandActions.length) % commandActions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentCmd = commandActions[selectedIndex] || commandActions[0];
      if (currentCmd) {
        currentCmd.run();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("全局指令面板")}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-start justify-center pt-24 p-4"
    >
      <div
        ref={dialogRef} tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden animate-apple-modal flex flex-col max-h-[70vh]"
      >
        <div className="p-3 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-ink-cyan" />
          <input
            autoFocus
            type="text"
            value={commandQuery}
            onChange={(e) => setCommandQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("输入指令名称、图表类型或分镜动作... (↑↓ 选择，Enter 执行)")}
            className="flex-1 bg-transparent border-none text-xs apple-font-mono focus:outline-none text-[#272822] dark:text-[#F8F8F2]"
            aria-label={t("搜索快捷指令")}
            aria-autocomplete="list"
            role="combobox"
            aria-expanded={isOpen}
            aria-activedescendant={commandActions.length ? `command-option-${commandActions[selectedIndex]?.id}` : undefined}
            aria-controls="command-palette-list"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[9px] font-semibold text-ink-muted apple-font-mono">ESC</kbd>
        </div>
        <div id="command-palette-list" role="listbox" className="flex-1 overflow-y-auto p-2 space-y-1">
          {commandActions.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-muted apple-font-mono">{t("未找到匹配的快捷指令")}</div>
          ) : (
            commandActions.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  id={`command-option-${cmd.id}`}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    cmd.run();
                    onClose();
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs apple-font-mono transition ${
                    isSelected
                      ? 'bg-[#EFECE1] dark:bg-[#34352D] border-[#F92672]/70 shadow-sm text-ink-pink'
                      : 'border-transparent hover:bg-[#EFECE1]/60 dark:hover:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className={`font-semibold truncate transition-colors ${isSelected ? 'text-ink-pink' : 'text-[#272822] dark:text-[#F8F8F2]'}`}>
                      {t(cmd.label)}
                    </div>
                    <div className="text-[10px] text-ink-muted">{t(cmd.category)}</div>
                  </div>
                  {cmd.shortcut && (
                    <kbd className={`px-2 py-0.5 rounded border text-[10px] font-bold shrink-0 apple-font-mono ${
                      isSelected
                        ? 'bg-action text-[#F8F8F2] border-[#F92672]'
                        : 'bg-[#EFECE1] dark:bg-[#272822] border-[#D6D4C8] dark:border-[#49483E] text-ink-green'
                    }`}>
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
