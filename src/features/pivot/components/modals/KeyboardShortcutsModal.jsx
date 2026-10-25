import { t } from '../../../../i18n.js';
import React, { useState, useMemo } from 'react';
import { Keyboard, X, Search, Sparkles, Command, MoveRight, Eye } from 'lucide-react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';

const SHORTCUT_GROUPS = [
  {
    category: '全局与导航 (Navigation)',
    items: [
      { keys: ['⌘K', 'Ctrl+K'], desc: '全局指令面板 (快速检索图表与动作)', isCommon: true, tip: '打字直达任何功能' },
      { keys: ['?'], desc: '打开键盘快捷键与操作指南', isCommon: true, tip: '随时唤起本帮助' },
      { keys: ['Esc'], desc: '关闭弹窗 / 退出全屏 / 取消高亮', isCommon: true, tip: '快速返回主视图' },
      { keys: ['Tab', 'Shift+Tab'], desc: '在弹窗控件间无障碍切换', tip: '键盘全流程无鼠标操作' },
    ],
  },
  {
    category: '多维透视与分析 (Pivot Analysis)',
    items: [
      { keys: ['R'], desc: '行列维度快速交叉转置 (Transpose)', isCommon: true, tip: '一键对调行与列的横纵视角' },
      { keys: ['双击单元格', 'Enter'], desc: '打开单元格或图表点对应的明细行', isCommon: true, tip: '核对汇总背后的原始记录' },
      { keys: ['Alt + 单击'], desc: '复制单个单元格数值到剪贴板', isCommon: true, tip: '快速取数' },
      { keys: ['拖选 + ⌘C', 'Ctrl+C'], desc: '框选区域复制为 TSV，可粘贴到表格软件', isCommon: true, tip: '批量取数' },
      { keys: ['双击列边框'], desc: '自适应调整单列列宽 (Auto-Fit)', tip: '内容自适应防止文字截断' },
      { keys: ['Click'], desc: '聚焦单元格并在图表中高亮对应序列', isCommon: true, tip: '表图联动高亮聚焦' },
    ],
  },
  {
    category: '演示',
    items: [
      { keys: ['T'], desc: '切换演示舞台模式', isCommon: true, tip: '隐藏侧栏，聚焦表图' },
      { keys: ['Space'], desc: '播放 / 暂停演示', isCommon: true },
      { keys: ['['], desc: '上一场景' },
      { keys: [']'], desc: '下一场景' },
    ],
  },
  {
    category: '导出',
    items: [
      { keys: ['⌘P', 'Ctrl+P'], desc: '浏览器打印；完整报表请用工具栏 .PDF' },
      { keys: ['Click'], desc: '导出 Excel / CSV / 图表', isCommon: true },
    ],
  },
];

export function KeyboardShortcutsModal({ isOpen, onClose }) {
  const dialogRef = useDialogFocus(isOpen, onClose);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredGroups = useMemo(() => {
    return SHORTCUT_GROUPS.map((group) => {
      if (activeCategory === 'common') {
        const items = group.items.filter((item) => item.isCommon);
        return items.length > 0 ? { ...group, items } : null;
      }
      if (activeCategory !== 'all' && !group.category.includes(activeCategory)) {
        return null;
      }
      if (!filterQuery.trim()) return group;
      const q = filterQuery.toLowerCase();
      const items = group.items.filter((item) =>
        item.desc.toLowerCase().includes(q) ||
        (item.tip && item.tip.toLowerCase().includes(q)) ||
        item.keys.some((k) => k.toLowerCase().includes(q))
      );
      return items.length > 0 ? { ...group, items } : null;
    }).filter(Boolean);
  }, [filterQuery, activeCategory]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      role="presentation"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 animate-apple-fade-in"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("快捷键指南")}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden animate-apple-modal apple-font-sans flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#66D9EF]/15 border border-[#66D9EF]/30 flex items-center justify-center">
              <Keyboard className="w-4 h-4 text-ink-cyan" />
            </div>
            <div>
              <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2">
                <span>{t("快捷键与高效操作指南")}</span>
                <span className="text-[10px] text-ink-pink font-semibold bg-[#F92672]/10 px-1.5 py-0.2 rounded border border-[#F92672]/20">
                  60 FPS KEYBOARD FLOW
                </span>
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("关闭快捷键指南")}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-muted hover:text-[#F92672] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-5 py-2.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/50 space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t("快速搜索快捷键或功能（如：转置、下钻、舞台、撤销）...")}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] apple-font-mono focus:outline-none focus:border-[#66D9EF]"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto text-[10.5px] apple-font-mono">
            {[
              { id: 'all', label: '全部' },
              { id: 'common', label: '⭐ 常用推荐' },
              { id: 'Navigation', label: '全局导航' },
              { id: 'Pivot Analysis', label: '透视分析' },
              { id: 'Presentation', label: '演播舞台' },
              { id: 'Data', label: '数据输出' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2 py-0.5 rounded-md border transition shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-[#66D9EF]/20 border-[#66D9EF] text-ink-cyan font-bold'
                    : 'border-[#D6D4C8] dark:border-[#49483E] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                }`}
              >
                {t(cat.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div tabIndex={0} role="region" aria-label={t('快捷键说明正文')} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-ink-muted apple-font-mono">
              {t("未找到匹配的快捷键或操作说明")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredGroups.map((group) => (
                <div
                  key={group.category}
                  className="p-3.5 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/70 space-y-2.5"
                >
                  <div className="text-[11px] font-bold text-ink-cyan apple-font-mono border-b border-[#D6D4C8] dark:border-[#3E3D32] pb-1 flex items-center justify-between">
                    <span>{t(group.category)}</span>
                    <span className="text-[9px] text-ink-muted font-normal">{group.items.length} 个快捷操作</span>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition">
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-[#272822] dark:text-[#F8F8F2] font-medium leading-tight flex items-center gap-1.5">
                            <span>{t(item.desc)}</span>
                            {item.isCommon && (
                              <span className="text-[8.5px] px-1 py-0.2 rounded bg-[#A6E22E]/15 text-ink-green border border-[#A6E22E]/30 shrink-0">
                                常用
                              </span>
                            )}
                          </div>
                          {item.tip && (
                            <div className="text-[9.5px] text-ink-muted mt-0.5 truncate">{item.tip}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          {item.keys.map((k) => (
                            <kbd
                              key={k}
                              className="px-2 py-0.5 rounded-md bg-[#FFFDF7] dark:bg-[#272822] border border-[#ACA99A] dark:border-[#49483E] shadow-[0_1px_0_1px_rgba(0,0,0,0.15)] text-[10px] font-bold text-[#272822] dark:text-[#F8F8F2] apple-font-mono"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 rounded-xl bg-gradient-to-r from-[#66D9EF]/10 via-[#A6E22E]/10 to-[#F92672]/10 border border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between gap-3 text-[11px]">
            <span className="text-ink-muted">
              {t("提示：在任何输入框外随时按问号「?」或「⌘K」即可快速呼出控制中心。")}
            </span>
            <kbd className="px-2 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#ACA99A] dark:border-[#49483E] font-bold apple-font-mono text-ink-pink shrink-0">
              ESC
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
