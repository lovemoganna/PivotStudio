import React from 'react';
import { Layers3, X } from 'lucide-react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';

export function SpecModal({ isOpen, onClose }) {
  const dialogRef = useDialogFocus(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label="内部设计规范" tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden animate-apple-modal"
      >
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers3 className="w-4 h-4 text-[#FD971F]" />
            <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2]">
              DESIGN_SPEC // PivotStudio 内部设计与工程规范
            </h3>
          </div>
          <button onClick={onClose} aria-label="关闭内部设计规范" className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#75715E] hover:text-[#F92672]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          <p className="text-[11px] text-[#75715E] dark:text-[#B8B5A8] leading-relaxed">本页面记录项目内部设计约定，不代表获得 Awwwards、Webby Awards 或 FWA 奖项。最终质量仍需真实浏览器测试与独立评审。</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 apple-font-mono">
            {[
              { name: 'Keyword Pink', hex: '#F92672', role: '主交互焦点 / 行维度 / 异常点' },
              { name: 'Function Green', hex: '#A6E22E', role: '筛选器 / 正向增长 / 测试通过' },
              { name: 'Type Cyan', hex: '#66D9EF', role: '列维度 / 日期粒度 / 拟合线' },
              { name: 'Param Orange', hex: '#FD971F', role: '值指标 / 均值基线 / 布尔类型' },
              { name: 'Const Purple', hex: '#AE81FF', role: '数字类型 / 汇总行 / 100K压测' },
              { name: 'String Yellow', hex: '#E6DB74', role: '文本类型 / 核心洞察 / SQL高亮' },
            ].map((token) => (
              <div key={token.hex} className="p-2.5 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/50 dark:bg-[#1E1F1C] flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-md shrink-0 shadow-sm border border-black/20" style={{ backgroundColor: token.hex }} />
                <div className="min-w-0">
                  <div className="font-bold text-[10px] truncate">{token.name} · {token.hex}</div>
                  <div className="text-[9px] text-[#75715E] dark:text-[#908E80] truncate">{token.role}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3.5 rounded-xl bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] space-y-1.5">
            <div className="font-bold text-[#F92672] apple-font-mono">1. 统一数据契约与纯函数透视引擎</div>
            <p className="text-[11px] text-[#75715E] dark:text-[#908E80]">
              所有外部数据源均先归一化为标准的 <code className="text-[#A6E22E]">UnifiedDataset</code>，再进入零副作用的 <code className="text-[#66D9EF]">calculatePivot</code> 计算多级树状表头、合并单元格跨度（rowSpan/colSpan）与总计/小计矩阵。
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] space-y-1.5">
            <div className="font-bold text-[#A6E22E] apple-font-mono">2. 统一 Chart Spec 与智能可视化渲染层</div>
            <p className="text-[11px] text-[#75715E] dark:text-[#908E80]">
              15 种图表统一消费 <code className="text-[#FD971F]">buildUnifiedChartSpec</code> 与 <code className="text-[#AE81FF]">UnifiedFormatter</code>，内置柱体/扇区智能防重叠标签、OLS 最小二乘回归趋势线、Z-Score 残差异常检测与 Sturges 直方图自动分箱。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
