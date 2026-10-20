import React from 'react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';
import { Palette, X } from 'lucide-react';
import { SHOW_AS_MODES } from '../../../../constants/pivotConstants';

export function FormatModal({
  isOpen,
  condFormat,
  setCondFormat,
  pivotConfig,
  setPivotConfig,
  onClose,
}) {
  const dialogRef = useDialogFocus(Boolean(isOpen), onClose);
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-label="数值与条件格式设置" tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-apple-modal"
      >
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between">
          <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#FD971F]" />
            <span>FORMAT_STUDIO // 条件格式、色阶数据条与数值显示方式 (步骤8)</span>
          </h3>
          <button onClick={onClose} aria-label="关闭数值与条件格式设置" className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#75715E] hover:text-[#F92672]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto text-xs">
          <div className="space-y-3">
            <div className="font-bold text-[#F92672] apple-font-mono">1. 透视表条件格式 (色阶 / 数据条 / 阈值标红)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#75715E] dark:text-[#908E80] mb-1 apple-font-mono">单元格背景色阶 (Color Scale):</label>
                <select
                  value={condFormat.colorScale}
                  onChange={(e) => setCondFormat((p) => ({ ...p, colorScale: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] apple-font-mono"
                >
                  <option value="none">关闭色阶 (None)</option>
                  <option value="green_yellow_red">红-黄-绿热力色阶</option>
                  <option value="blue_scale">Monokai 冰川青色阶</option>
                  <option value="emerald_scale">Monokai 荧光绿色阶</option>
                </select>
              </div>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer apple-font-mono">
                  <input
                    type="checkbox"
                    checked={condFormat.showDataBar}
                    onChange={(e) => setCondFormat((p) => ({ ...p, showDataBar: e.target.checked }))}
                    className="rounded accent-[#A6E22E]"
                  />
                  <span>启用单元格内嵌比例数据条 (Data Bar)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer apple-font-mono">
                  <input
                    type="checkbox"
                    checked={condFormat.customRuleEnabled}
                    onChange={(e) => setCondFormat((p) => ({ ...p, customRuleEnabled: e.target.checked }))}
                    className="rounded accent-[#F92672]"
                  />
                  <span>启用自定义阈值高亮规则</span>
                </label>
              </div>
            </div>
            {condFormat.customRuleEnabled && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] apple-font-mono">
                <span>当数值</span>
                <select
                  value={condFormat.customRuleOp}
                  onChange={(e) => setCondFormat((p) => ({ ...p, customRuleOp: e.target.value }))}
                  className="px-2 py-1 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E]"
                >
                  <option value="gt">大于 (&gt;)</option>
                  <option value="lt">小于 (&lt;)</option>
                  <option value="eq">等于 (=)</option>
                </select>
                <input
                  type="number"
                  value={condFormat.customRuleValue}
                  onChange={(e) => setCondFormat((p) => ({ ...p, customRuleValue: e.target.value }))}
                  className="w-32 px-2 py-1 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E]"
                />
                <span className="text-[#F92672] font-bold">时以品红加粗下划线高亮</span>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-4">
            <div className="font-bold text-[#66D9EF] apple-font-mono">2. 值字段显示方式 (占比/环比) 与数值精度</div>
            {pivotConfig.values.length === 0 ? (
              <div className="text-[#75715E] italic apple-font-mono">/* 当前值区域为空，请先拖入值指标 */</div>
            ) : (
              pivotConfig.values.map((vItem) => (
                <div key={vItem.id} className="p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center apple-font-mono">
                  <div className="font-bold text-[#FD971F] truncate">{vItem.field} ({vItem.agg})</div>
                  <div>
                    <label className="block text-[9px] text-[#75715E] mb-0.5">显示方式 (Show As):</label>
                    <select
                      value={vItem.showAs || 'normal'}
                      onChange={(e) => {
                        const nextShowAs = e.target.value;
                        setPivotConfig((prev) => ({
                          ...prev,
                          values: prev.values.map((v) => (v.id === vItem.id ? { ...v, showAs: nextShowAs } : v)),
                        }));
                      }}
                      className="w-full px-2 py-1 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
                    >
                      {SHOW_AS_MODES.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#75715E] mb-0.5">货币符号 / 小数位:</label>
                    <div className="flex items-center gap-1">
                      <select
                        value={vItem.format?.currency ?? ''}
                        onChange={(e) => {
                          const cur = e.target.value;
                          setPivotConfig((prev) => ({
                            ...prev,
                            values: prev.values.map((v) =>
                              v.id === vItem.id ? { ...v, format: { ...v.format, currency: cur } } : v
                            ),
                          }));
                        }}
                        className="px-1.5 py-1 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
                      >
                        <option value="">无符号</option>
                        <option value="¥">¥ (CNY)</option>
                        <option value="$">$ (USD)</option>
                      </select>
                      <select
                        value={vItem.format?.decimals ?? 0}
                        onChange={(e) => {
                          const dec = Number(e.target.value);
                          setPivotConfig((prev) => ({
                            ...prev,
                            values: prev.values.map((v) =>
                              v.id === vItem.id ? { ...v, format: { ...v.format, decimals: dec } } : v
                            ),
                          }));
                        }}
                        className="px-1.5 py-1 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
                      >
                        <option value={0}>0位小数</option>
                        <option value={1}>1位小数</option>
                        <option value={2}>2位小数</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px]">
                    <input
                      type="checkbox"
                      checked={vItem.format?.thousands !== false}
                      onChange={(e) => {
                        const th = e.target.checked;
                        setPivotConfig((prev) => ({
                          ...prev,
                          values: prev.values.map((v) =>
                            v.id === vItem.id ? { ...v, format: { ...v.format, thousands: th } } : v
                          ),
                        }));
                      }}
                      className="rounded accent-[#A6E22E]"
                    />
                    <span>千分位分隔符</span>
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
