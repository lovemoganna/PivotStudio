import { t } from '../../../../i18n.js';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Sparkles, Command, ArrowRight } from 'lucide-react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';

export function CommandPaletteModal({
  isOpen,
  onClose,
  commandQuery,
  setCommandQuery,
  commandActions,
  soundEngine,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const itemRefs = useRef([]);
  const dialogRef = useDialogFocus(isOpen, onClose);

  // Extract unique categories for filter pills
  const categories = useMemo(() => {
    const set = new Set();
    commandActions.forEach((cmd) => {
      if (cmd.category) set.add(cmd.category);
    });
    return Array.from(set);
  }, [commandActions]);

  // Filter actions based on both activeCategory and commandActions
  const displayedActions = useMemo(() => {
    if (activeCategory === 'all') return commandActions;
    return commandActions.filter((cmd) => cmd.category === activeCategory);
  }, [commandActions, activeCategory]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [commandQuery, isOpen, activeCategory]);

  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (displayedActions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      soundEngine?.playHaptic?.('light');
      setSelectedIndex((prev) => (prev + 1) % displayedActions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      soundEngine?.playHaptic?.('light');
      setSelectedIndex((prev) => (prev - 1 + displayedActions.length) % displayedActions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentCmd = displayedActions[selectedIndex] || displayedActions[0];
      if (currentCmd) {
        soundEngine?.playSuccess?.();
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
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-start justify-center pt-20 p-4 animate-apple-fade-in"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden animate-apple-modal flex flex-col max-h-[72vh]"
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center gap-2.5 shrink-0">
          <Search className="w-4 h-4 text-ink-cyan shrink-0" />
          <input
            autoFocus
            type="text"
            value={commandQuery}
            onChange={(e) => setCommandQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("搜索指令或图表类型... (↑↓ 选择，Enter 执行)")}
            className="flex-1 bg-transparent border-none text-xs apple-font-mono focus:outline-none text-[#272822] dark:text-[#F8F8F2] placeholder:text-ink-muted"
            aria-label={t("搜索快捷指令")}
            aria-autocomplete="list"
            role="combobox"
            aria-expanded={isOpen}
            aria-activedescendant={displayedActions.length ? `command-option-${displayedActions[selectedIndex]?.id}` : undefined}
            aria-controls="command-palette-list"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[9px] font-semibold text-ink-muted apple-font-mono shrink-0">
            ESC
          </kbd>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 1 && (
          <div className="px-3 py-1.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/30 dark:bg-[#1E1F1C]/40 flex items-center gap-1.5 overflow-x-auto text-[10px] apple-font-mono shrink-0">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2 py-0.5 rounded-md border transition shrink-0 ${
                activeCategory === 'all'
                  ? 'bg-[#66D9EF]/20 border-[#66D9EF] text-ink-cyan font-bold'
                  : 'border-transparent text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
              }`}
            >
              {t("全部")} ({commandActions.length})
            </button>
            {categories.map((cat) => {
              const count = commandActions.filter((c) => c.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-0.5 rounded-md border transition shrink-0 ${
                    activeCategory === cat
                      ? 'bg-[#66D9EF]/20 border-[#66D9EF] text-ink-cyan font-bold'
                      : 'border-transparent text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                  }`}
                >
                  {t(cat)} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Actions Listbox */}
        <div id="command-palette-list" role="listbox" className="flex-1 overflow-y-auto p-2 space-y-1">
          {displayedActions.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-muted apple-font-mono space-y-1">
              <div>{t("未找到匹配的快捷指令")}</div>
              <div className="text-[10px] opacity-75">{t("尝试搜索「柱图」、「转置」或「导出」")}</div>
            </div>
          ) : (
            displayedActions.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  id={`command-option-${cmd.id}`}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => {
                    if (selectedIndex !== idx) {
                      setSelectedIndex(idx);
                      soundEngine?.playHaptic?.('light');
                    }
                  }}
                  onClick={() => {
                    soundEngine?.playSuccess?.();
                    cmd.run();
                    onClose();
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs apple-font-mono transition ${
                    isSelected
                      ? 'bg-[#EFECE1] dark:bg-[#34352D] border-[#F92672]/70 shadow-sm text-ink-pink'
                      : 'border-transparent hover:bg-[#EFECE1]/60 dark:hover:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold truncate transition-colors ${isSelected ? 'text-ink-pink' : 'text-[#272822] dark:text-[#F8F8F2]'}`}>
                      {t(cmd.label)}
                    </div>
                    <div className="text-[10px] text-ink-muted flex items-center gap-1.5 mt-0.5">
                      <span className="px-1 py-0.2 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[9px]">
                        {t(cmd.category)}
                      </span>
                    </div>
                  </div>
                  {cmd.shortcut && (
                    <kbd
                      className={`px-2 py-0.5 rounded border text-[10px] font-bold shrink-0 apple-font-mono ${
                        isSelected
                          ? 'bg-action text-[#F8F8F2] border-[#F92672]'
                          : 'bg-[#EFECE1] dark:bg-[#272822] border-[#D6D4C8] dark:border-[#49483E] text-ink-green'
                      }`}
                    >
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-3.5 py-2 border-t border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#272822] flex items-center justify-between text-[10px] text-ink-muted apple-font-mono shrink-0">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[9px] text-[#272822] dark:text-[#F8F8F2] font-semibold">
                ↑↓
              </kbd>{' '}
              {t("导航")}
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[9px] text-[#272822] dark:text-[#F8F8F2] font-semibold">
                ↵
              </kbd>{' '}
              {t("执行")}
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[9px] text-[#272822] dark:text-[#F8F8F2] font-semibold">
                ESC
              </kbd>{' '}
              {t("关闭")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
