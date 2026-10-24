import React from 'react';
import { X, Pencil, Plus, Sparkles, Lightbulb, Wand2 } from 'lucide-react';
import { t } from '../../../../i18n.js';
import { useDialogFocus } from '../../../../utils/useDialogFocus';

const CONCLUSION_INSPIRATIONS = [
  '📈 核心业务保持稳健增长，主力类目贡献超 60% 份额',
  '⚠️ 利润率出现结构性分化，需重点关注长尾商品的折扣折损',
  '🔍 建议深入下钻细分市场与二线渠道，聚焦高客单客户群',
  '🎯 季度经营指标基本达成预期，下阶段聚焦降本增效与留存',
  '📊 头部集中效应显著，需关注前三大项的供需稳定性',
  '💡 均值以上项驱动整体大盘，尾部项建议采取精细化运营',
];

/** Shared form and dialog lifecycle; callers retain edit/save business actions. */
export function StoryShotDialog({ mode, number, form, setForm, onClose, onSubmit, currentInsight, unifiedChartSpec }) {
  const ref = useDialogFocus(Boolean(mode), onClose);
  if (!mode) return null;
  const editing = mode === 'edit';
  const title = editing ? t('编辑分镜内容') : t('保存当前分析为新分镜');
  const Icon = editing ? Pencil : Plus;

  const handleApplyInspiration = (text) => {
    setForm((p) => ({
      ...p,
      subtitle: p.subtitle ? `${p.subtitle} · ${text}` : text,
    }));
  };

  const handleAutoGenerateConclusion = () => {
    if (!currentInsight) {
      if (unifiedChartSpec?.primarySeriesKey) {
        setForm((p) => ({
          ...p,
          subtitle: `聚焦【${unifiedChartSpec.xDimensionLabel || '维度'}】在【${unifiedChartSpec.primarySeriesKey}】上的整体对比与结构分布。`,
        }));
      }
      return;
    }
    const parts = [
      `首位「${currentInsight.topName}」以 ${currentInsight.topFormatted} 领跑（占整体 ${currentInsight.topSharePct}%）`,
      currentInsight.groupCount > 1 ? `末位「${currentInsight.bottomName}」(${currentInsight.bottomFormatted})` : '',
      currentInsight.top3SharePct && currentInsight.groupCount >= 3 ? `前3位合计贡献 ${currentInsight.top3SharePct}%` : '',
      `组间均值 ${currentInsight.meanFormatted}（${currentInsight.aboveMeanCount}/${currentInsight.groupCount} 组跑赢均值）`,
      currentInsight.topSharePct && Number(currentInsight.topSharePct) > 40
        ? '业务呈现较强头部集中特征，建议巩固主力盘并关注长尾提效'
        : '各分组规模分布较为平稳健康',
    ].filter(Boolean);
    const generated = parts.join('；') + '。';
    setForm((p) => ({
      ...p,
      subtitle: generated,
    }));
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 animate-apple-fade-in"
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl p-5 space-y-4 animate-apple-modal"
      >
        <header className="flex items-center justify-between gap-2 border-b border-[#D6D4C8] dark:border-[#3E3D32] pb-3">
          <div>
            <h3 className="text-xs font-bold apple-font-mono flex items-center gap-1.5 text-[#272822] dark:text-[#F8F8F2]">
              <Icon className="w-3.5 h-3.5 text-ink-cyan" />
              <span>{title}{editing && ` · [SHOT ${number}]`}</span>
            </h3>
            <p className="text-[10px] text-ink-muted mt-0.5">
              {t('记录透视分析的核心业务发现与决策建议，形成可复盘、可汇报的分析故事')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('关闭分镜表单')}
            className="p-1 text-ink-muted hover:text-[#F92672] transition rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.title.trim()) onSubmit();
          }}
          className="space-y-3.5 text-xs"
        >
          <label className="block">
            <span className="block text-[11px] font-semibold text-ink-muted mb-1 apple-font-mono">
              {t('分镜标题:')}
            </span>
            <input
              aria-label={t('分镜标题:')}
              type="text"
              required
              maxLength={64}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder={t("如：华东区 Q3 销售与毛利透视")}
              className="w-full px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] apple-font-mono text-xs focus:outline-none focus:border-[#66D9EF]"
            />
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-ink-muted apple-font-mono">
                {t('业务结论与讲解旁白:')}
              </span>
              {(currentInsight || unifiedChartSpec?.primarySeriesKey) && (
                <button
                  type="button"
                  onClick={handleAutoGenerateConclusion}
                  className="px-2 py-0.5 rounded bg-[#A6E22E]/15 text-ink-green border border-[#A6E22E]/35 text-[10px] font-semibold hover:bg-[#A6E22E]/25 transition flex items-center gap-1"
                  title={t("根据当前图表与计算指标自动生成业务结论草稿")}
                >
                  <Wand2 className="w-2.5 h-2.5" />
                  <span>{t("✨ 智能填入数据结论")}</span>
                </button>
              )}
            </div>
            <textarea
              aria-label={t('业务结论与讲解旁白:')}
              rows={3}
              maxLength={256}
              value={form.subtitle}
              onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
              placeholder={t("阐述当前透视矩阵与图表的核心洞察，用于 Keynote 演讲与报表旁白...")}
              className="w-full px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] apple-font-mono text-xs focus:outline-none focus:border-[#66D9EF]"
            />
          </div>

          {/* Business Conclusion Inspirations */}
          <div className="space-y-1.5 p-2.5 rounded-xl bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/60 border border-[#D6D4C8] dark:border-[#3E3D32]">
            <div className="text-[10px] font-semibold text-ink-yellow flex items-center gap-1 apple-font-mono">
              <Lightbulb className="w-3 h-3 text-ink-yellow" />
              <span>{t("常用业务结论句式（点击快速填入）：")}</span>
            </div>
            <div className="flex flex-col gap-1">
              {CONCLUSION_INSPIRATIONS.map((insp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyInspiration(insp)}
                  className="text-left text-[10px] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/5 dark:hover:bg-white/5 px-1.5 py-0.5 rounded transition truncate"
                >
                  {insp}
                </button>
              ))}
            </div>
          </div>

          <footer className="flex justify-end gap-2 pt-2 border-t border-[#D6D4C8] dark:border-[#3E3D32]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] text-xs apple-font-mono hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {t('取消')}
            </button>
            <button
              type="submit"
              disabled={!form.title.trim()}
              className="px-4 py-1.5 rounded-lg bg-action text-[#F8F8F2] font-bold text-xs apple-font-mono hover:opacity-90 transition disabled:opacity-40"
            >
              {t(editing ? '保存修改' : '保存分镜')}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
