import { t } from '../../../../i18n.js';
import React, { useState } from 'react';
import { Layers3, X, Compass, Lightbulb, BarChart3, TrendingUp, PieChart, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';

export function SpecModal({ isOpen, onClose }) {
  const dialogRef = useDialogFocus(isOpen, onClose);
  const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'tokens'

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 animate-apple-fade-in"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("内部设计规范")}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl flex flex-col overflow-hidden animate-apple-modal"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#AE81FF]/15 border border-[#AE81FF]/30 flex items-center justify-center">
              <Layers3 className="w-4 h-4 text-ink-orange" />
            </div>
            <div>
              <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2">
                <span>{t("DESIGN_SPEC // PivotStudio 内部设计与工程规范")}</span>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#66D9EF]/15 text-ink-cyan border border-[#66D9EF]/30 font-semibold">
                  {t("零基础友好")}
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("关闭内部设计规范")}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-muted hover:text-[#F92672] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center gap-2 shrink-0 bg-[#EFECE1]/30 dark:bg-[#1E1F1C]/40">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition apple-font-mono ${
              activeTab === 'guide'
                ? 'border-[#66D9EF] text-ink-cyan bg-[#66D9EF]/10 rounded-t-lg'
                : 'border-transparent text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t("数据分析方法与核心概念")}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tokens')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition apple-font-mono ${
              activeTab === 'tokens'
                ? 'border-[#AE81FF] text-ink-purple bg-[#AE81FF]/10 rounded-t-lg'
                : 'border-transparent text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
            }`}
          >
            <Layers3 className="w-3.5 h-3.5" />
            <span>{t("视觉语义与工程约定")}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {activeTab === 'guide' ? (
            <div className="space-y-4 animate-apple-fade-in">
              {/* Beginner Welcome Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#66D9EF]/10 via-[#A6E22E]/10 to-[#FD971F]/10 border border-[#D6D4C8] dark:border-[#3E3D32] flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-ink-yellow shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-ink-yellow text-xs apple-font-mono">
                    {t("数据透视的本质：将庞杂的明细数据，切片分类并聚合计算")}
                  </div>
                  <p className="text-[11px] text-ink-muted dark:text-[#C5C2B4] leading-relaxed">
                    {t("面对成千上万行流水表格时，人脑难以直接发现规律。PivotStudio 让你像搭积木一样，通过拖拽「维度」与「度量」，瞬间完成交叉统计与图表呈现。")}
                  </p>
                </div>
              </div>

              {/* Four Core Elements */}
              <div className="space-y-2">
                <div className="font-bold text-ink-pink apple-font-mono flex items-center gap-1.5">
                  <span>1. {t("透视分析的四大基础构件")}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/50 dark:bg-[#1E1F1C] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-ink-pink apple-font-mono">
                      <span className="w-2 h-2 rounded-full bg-[#F92672]" />
                      <span>{t("行维度 (Rows) · 纵向分组")}</span>
                    </div>
                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      {t("用于分类与分层（例如按「地区」、「产品类别」）。每一行代表一个业务实体，纵向展开排布。")}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/50 dark:bg-[#1E1F1C] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-ink-cyan apple-font-mono">
                      <span className="w-2 h-2 rounded-full bg-[#66D9EF]" />
                      <span>{t("列维度 (Columns) · 横向对比")}</span>
                    </div>
                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      {t("放在横向表头（例如「年份」、「月份」）。将不同时期或分类并排对比，一眼看清交叉结构。")}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/50 dark:bg-[#1E1F1C] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-ink-orange apple-font-mono">
                      <span className="w-2 h-2 rounded-full bg-[#FD971F]" />
                      <span>{t("值区域 (Values) · 核心度量")}</span>
                    </div>
                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      {t("要计算的数值。支持求和(SUM)、平均值(AVG)、计数(COUNT)、去重计数(DISTINCT)及同环比占比计算。")}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/50 dark:bg-[#1E1F1C] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-ink-green apple-font-mono">
                      <span className="w-2 h-2 rounded-full bg-[#A6E22E]" />
                      <span>{t("筛选器 (Filters) · 范围聚焦")}</span>
                    </div>
                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      {t("按条件过滤干扰数据（例如只分析「华东地区」或「2025年订单」），锁定关键业务范围。")}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Steps to Business Conclusion */}
              <div className="p-3.5 rounded-xl bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] space-y-2">
                <div className="font-bold text-ink-green apple-font-mono flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-ink-green" />
                  <span>2. {t("数据分析 4 步闭环：从数据到决策")}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[10.5px]">
                  <div className="p-2 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32]">
                    <div className="font-bold text-ink-yellow">① {t("明确目标")}</div>
                    <div className="text-ink-muted mt-0.5">{t("例如排查某品类利润下滑的原因")}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32]">
                    <div className="font-bold text-ink-pink">② {t("透视搭架")}</div>
                    <div className="text-ink-muted mt-0.5">{t("行放品类，值放销售额与毛利率")}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32]">
                    <div className="font-bold text-ink-cyan">③ {t("图表选型")}</div>
                    <div className="text-ink-muted mt-0.5">{t("看趋势选折线，看对比选柱图")}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32]">
                    <div className="font-bold text-ink-purple">④ {t("下钻探因")}</div>
                    <div className="text-ink-muted mt-0.5">{t("回车穿透异常单元格查看原始流水")}</div>
                  </div>
                </div>
              </div>

              {/* Analytical Caveats & Tips */}
              <div className="p-3 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FAF8F1] dark:bg-[#191A17] space-y-1.5">
                <div className="font-bold text-ink-orange apple-font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-ink-orange" />
                  <span>{t("零基础新手分析避坑指南:")}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-ink-muted leading-relaxed">
                  <li><strong>{t("去重计数 (DISTINCT) vs 计数 (COUNT):")}</strong> {t("统计客户数请用去重计数；统计订单交易量请用普通计数。")}</li>
                  <li><strong>{t("平均值无法直接代替业务毛利率:")}</strong> {t("综合毛利率需用「总毛利 ÷ 总销售额」复合度量计算，而非各行毛利率的简单算术均值。可在顶栏「格式与数值」中一键创建。")}</li>
                  <li><strong>{t("空值不会默认当做 0:")}</strong> {t("未发生的记录会显示为“-”，以防扭曲真实的平均水平和比率统计。")}</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-apple-fade-in">
              <p className="text-[11px] text-ink-muted dark:text-[#B8B5A8] leading-relaxed">
                {t("本页面记录项目内部设计约定，不代表获得 Awwwards、Webby Awards 或 FWA 奖项。最终质量仍需真实浏览器测试与独立评审。")}
              </p>
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
                      <div className="text-[9px] text-ink-muted truncate">{token.role}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3.5 rounded-xl bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] space-y-1.5">
                <div className="font-bold text-ink-pink apple-font-mono">{t("1. 统一数据契约与纯函数透视引擎")}</div>
                <p className="text-[11px] text-ink-muted">
                  {' ' + t("所有外部数据源均先归一化为标准的") + ' '}<code className="text-ink-green">UnifiedDataset</code>{t("，再进入零副作用的") + ' '}<code className="text-ink-cyan">calculatePivot</code>{' ' + t("计算多级树状表头、合并单元格跨度（rowSpan/colSpan）与总计/小计矩阵。") + ' '}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] space-y-1.5">
                <div className="font-bold text-ink-green apple-font-mono">{t("2. 统一 Chart Spec 与智能可视化渲染层")}</div>
                <p className="text-[11px] text-ink-muted">
                  {' ' + t("15 种图表统一消费") + ' '}<code className="text-ink-orange">buildUnifiedChartSpec</code>{' ' + t("与") + ' '}<code className="text-ink-purple">UnifiedFormatter</code>{t("，内置柱体/扇区智能防重叠标签、OLS 最小二乘回归趋势线、Z-Score 残差异常检测与 Sturges 直方图自动分箱。") + ' '}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
