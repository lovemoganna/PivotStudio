import React from 'react';
import { X, Pencil, Plus, Lightbulb, Wand2 } from 'lucide-react';
import { t } from '../../../../i18n.js';
import { useDialogFocus } from '../../../../utils/useDialogFocus';

/** Neutral analytical sentence starters — no industry-specific claims. */
const CONCLUSION_INSPIRATIONS = [
  '最高项明显高于其余分组，建议先下钻该组明细核对。',
  '前三项合计占比较高，头部集中，长尾可单独筛选后再看。',
  '各组接近均值，差异不大；可换维度或加筛选再比较。',
  '首末差距较大，先确认排序与筛选是否符合分析意图。',
  '若存在时间字段，可改按月/季看趋势是否稳定。',
  '下一步：固定当前维度，换一个指标对照验证结论。',
];

/** Shared form and dialog lifecycle; callers retain edit/save business actions. */
export function StoryShotDialog({ mode, number, form, setForm, onClose, onSubmit, currentInsight, unifiedChartSpec }) {
  const ref = useDialogFocus(Boolean(mode), onClose);
  if (!mode) return null;
  const editing = mode === 'edit';
  const title = editing ? t('编辑分析笔记') : t('保存当前视图为分析笔记');
  const Icon = editing ? Pencil : Plus;

  const handleApplyInspiration = (text) => {
    setForm((p) => ({
      ...p,
      subtitle: p.subtitle ? `${p.subtitle} ${text}` : text,
    }));
  };

  const handleAutoGenerateConclusion = () => {
    if (!currentInsight) {
      if (unifiedChartSpec?.primarySeriesKey) {
        setForm((p) => ({
          ...p,
          subtitle: `按「${unifiedChartSpec.xDimensionLabel || t('维度')}」比较「${unifiedChartSpec.primarySeriesKey}」。`,
        }));
      }
      return;
    }
    const parts = [
      `最高「${currentInsight.topName}」为 ${currentInsight.topFormatted}${currentInsight.topSharePct ? `（占图中合计 ${currentInsight.topSharePct}%）` : ''}`,
      currentInsight.groupCount > 1 ? `最低「${currentInsight.bottomName}」为 ${currentInsight.bottomFormatted}` : '',
      currentInsight.top3SharePct && currentInsight.groupCount >= 3 ? `前 3 组合计 ${currentInsight.top3SharePct}%` : '',
      currentInsight.groupCount > 1
        ? `组均值 ${currentInsight.meanFormatted}（${currentInsight.aboveMeanCount}/${currentInsight.groupCount} 组高于均值）`
        : '',
      currentInsight.topSharePct && Number(currentInsight.topSharePct) > 40
        ? '头部占比较高，建议下钻核对最高项明细'
        : '各组规模相对分散',
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
              <span>{title}{editing && number ? ` · ${number}` : ''}</span>
            </h3>
            <p className="text-[10px] text-ink-muted mt-0.5">
              {t('为当前透视与图表视图添加标题与结论说明')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('关闭分析笔记表单')}
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
              {t('笔记标题:')}
            </span>
            <input
              aria-label={t('笔记标题:')}
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
                {t('分析结论:')}
              </span>
              {(currentInsight || unifiedChartSpec?.primarySeriesKey) && (
                <button
                  type="button"
                  onClick={handleAutoGenerateConclusion}
                  className="px-2 py-0.5 rounded bg-[#A6E22E]/15 text-ink-green border border-[#A6E22E]/35 text-[10px] font-semibold hover:bg-[#A6E22E]/25 transition flex items-center gap-1"
                  title={t("根据当前图表指标生成结论草稿")}
                >
                  <Wand2 className="w-2.5 h-2.5" />
                  <span>{t("填入数据结论")}</span>
                </button>
              )}
            </div>
            <textarea
              aria-label={t('分析结论:')}
              rows={3}
              maxLength={256}
              value={form.subtitle}
              onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
              placeholder={t("简述当前视图的核心结论...")}
              className="w-full px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] apple-font-mono text-xs focus:outline-none focus:border-[#66D9EF]"
            />
          </div>

          <div className="space-y-1.5 p-2.5 rounded-xl bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/60 border border-[#D6D4C8] dark:border-[#3E3D32]">
            <div className="text-[10px] font-semibold text-ink-yellow flex items-center gap-1 apple-font-mono">
              <Lightbulb className="w-3 h-3 text-ink-yellow" />
              <span>{t("常用结论句式（点击填入）：")}</span>
            </div>
            <div className="flex flex-col gap-1">
              {CONCLUSION_INSPIRATIONS.map((insp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyInspiration(insp)}
                  className="text-left text-[10px] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/5 dark:hover:bg-white/5 px-1.5 py-0.5 rounded transition"
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
              {t(editing ? '保存修改' : '保存笔记')}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
