import { t } from '../../../../i18n.js';
import React, { useState, useEffect, useRef } from 'react';
import { Globe, Server, Zap, X, Info, ExternalLink, Code2, Database, Sparkles, Check } from 'lucide-react';
import { generateDuckDBPivotSQL } from '../../../../services/duckdbQuery';
import { useDialogFocus } from '../../../../utils/useDialogFocus';

export function DataSourceModal({
  runImport,
  onImportDataset,
  activeDataSourceModal,
  onModeChange,
  onClose,
  gsheetUrlInput,
  setGsheetUrlInput,
  duckdbThreshold,
  currentDataset,
  pivotConfig,
  generate100kDataset,
  copyTextToClipboard,
  showToast
}) {
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(null);

  useEffect(() => {
    setLoading(false);
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [activeDataSourceModal]);

  const dialogRef = useDialogFocus(Boolean(activeDataSourceModal), onClose);
  if (!activeDataSourceModal) return null;

  async function importPublicSheet() {
    const match = gsheetUrlInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      showToast?.('请输入有效的 Google Sheets 链接', 'error');
      return;
    }
    const id = match[1];
    const gid = gsheetUrlInput.match(/(?:[?#&]gid=)(\d+)/)?.[1] || '0';
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    setLoading(true);
    try {
      const url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/export?format=csv&gid=' + encodeURIComponent(gid);
      const res = await fetch(url, { credentials: 'omit', signal: request.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const csv = await res.text();
      if (requestRef.current !== request) return;
      if (/^\s*<!doctype html|^\s*<html/i.test(csv)) throw new Error('返回了登录或权限页面');
      const sheet = (await runImport({ text: csv }, 'Google Sheets'))[0];
      if (requestRef.current !== request) return;
      const rows = (await runImport({ sheets: [sheet], normalize: true }, 'Google Sheets'))[0].rows;
      if (requestRef.current !== request) return;
      const ds = {
        id: 'ds_google_' + Date.now(),
        name: 'Google Sheets ' + id.slice(0, 8) + ' (' + rows.length + ' 行)',
        fields: sheet.fields,
        rows
      };
      onImportDataset(ds);
      onClose();
      showToast?.('已读取真实公开数据：' + rows.length + ' 行');
    } catch (err) {
      if (err.name === 'AbortError' || requestRef.current !== request) return;
      showToast?.('导入失败：' + err.message + '。请检查公开访问权限、CSV 导出及浏览器跨域限制', 'error');
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-apple-fade-in"
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("数据源管理")}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl text-xs flex flex-col animate-apple-modal"
      >
        {/* Sticky Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7]/95 dark:bg-[#272822]/95 backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2]">
            {activeDataSourceModal === 'gsheet' ? (
              <Globe className="w-4 h-4 text-ink-cyan" />
            ) : activeDataSourceModal === 'sql' ? (
              <Server className="w-4 h-4 text-ink-orange" />
            ) : (
              <Zap className="w-4 h-4 text-ink-purple" />
            )}
            <span>
              {activeDataSourceModal === 'gsheet'
                ? t("Google Sheets 公开 CSV")
                : activeDataSourceModal === 'sql'
                ? 'SQL 数据库 · 未实现'
                : '本地合成数据 / SQL 模板'}
            </span>
          </div>
          <button
            aria-label={t("关闭数据源")}
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-black/10 dark:hover:bg-white/10 text-ink-muted hover:text-[#F92672] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Tab Selector */}
        <div
          role="group"
          aria-label={t('数据源类型')}
          className="flex flex-wrap gap-2 px-5 pt-3.5 pb-2 bg-[#EFECE1]/30 dark:bg-[#1E1F1C]/40 border-b border-[#D6D4C8] dark:border-[#3E3D32]"
        >
          {[
            ['gsheet', '公开工作表'],
            ['sql', 'SQL 连接说明'],
            ['bigdata', 'SQL 模板与压测'],
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={activeDataSourceModal === mode}
              onClick={() => onModeChange?.(mode)}
              className={`px-3 py-1.5 rounded-lg border font-semibold text-xs apple-font-mono transition ${
                activeDataSourceModal === mode
                  ? 'bg-[#66D9EF]/20 text-ink-cyan border-[#66D9EF] shadow-xs'
                  : 'border-[#D6D4C8] dark:border-[#49483E] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-5 space-y-4 flex-1">
          {activeDataSourceModal === 'gsheet' && (
            <div className="space-y-3.5 animate-apple-fade-in">
              <div className="p-3 rounded-xl bg-[#66D9EF]/10 border border-[#66D9EF]/30 space-y-2">
                <div className="font-bold text-ink-cyan flex items-center gap-1.5 apple-font-mono">
                  <Info className="w-3.5 h-3.5" />
                  <span>{t("如何准备 Google Sheets 公开链接：")}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-ink-muted leading-relaxed">
                  <li>{t("在 Google Sheets 点击右上角「共享 (Share)」")}</li>
                  <li>{t("通用访问权限选择「知道链接的任何人 (Anyone with the link)」都可以查看")}</li>
                  <li>{t("复制链接粘贴到下方输入框（支持附带 ?gid= 的指定工作表）")}</li>
                </ol>
              </div>

              <p className="leading-relaxed text-ink-muted dark:text-[#B8B5A8] text-[11px]">
                {t("仅支持可公开导出 CSV 的工作表；私有 OAuth、定时同步和完整工作簿同步尚未实现。失败时不会使用演示数据替代。")}
              </p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="gsheet-url" className="font-semibold text-xs apple-font-mono">
                    {t("Google Sheets 链接（可指定 gid）")}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setGsheetUrlInput('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0');
                      showToast?.('已填入公开测试表链接');
                    }}
                    className="text-[10.5px] text-ink-cyan hover:underline apple-font-mono flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{t("填入官方测试表样例")}</span>
                  </button>
                </div>
                <input
                  id="gsheet-url"
                  value={gsheetUrlInput}
                  onChange={(e) => setGsheetUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                  className="w-full rounded-lg px-3 py-2 border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C] text-xs apple-font-mono focus:outline-none focus:border-[#66D9EF]"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  disabled={loading}
                  onClick={importPublicSheet}
                  className="rounded-lg bg-[#66D9EF] px-4 py-2 text-[#1E1F1C] font-bold text-xs apple-font-mono shadow-xs hover:bg-[#7AE2F8] transition disabled:opacity-50"
                >
                  {loading ? t("正在请求真实数据…") : t("读取公开工作表")}
                </button>
              </div>
            </div>
          )}

          {activeDataSourceModal === 'sql' && (
            <div className="space-y-3.5 animate-apple-fade-in">
              <div
                role="status"
                className="space-y-2 rounded-xl border border-[#FD971F]/40 bg-[#FD971F]/10 px-4 py-3.5 leading-relaxed"
              >
                <p className="font-bold text-ink-orange apple-font-mono">{t("数据库连接及 SQL 查询尚未实现")}</p>
                <p className="text-[11px] text-ink-muted">
                  {t("当前仓库没有数据库代理、服务器认证或真实 SQL 执行。此界面不再提供伪连接按钮或返回内置数据冒充查询结果。")}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {t("接入前须建立安全的只读服务端代理、SQL 校验、超时控制与错误处理。")}
                </p>
              </div>

              {/* Educational Value for Beginner Analysts */}
              <div className="p-3.5 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/70 space-y-2 text-[11px]">
                <div className="font-bold text-ink-green apple-font-mono flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-ink-green" />
                  <span>{t("视觉透视与 SQL 聚合的等价逻辑：")}</span>
                </div>
                <p className="text-ink-muted leading-relaxed">
                  {t("在 PivotStudio 中，你在界面上拖入的「行维度」和「列维度」，本质对应 SQL 查询中的 ")}
                  <code className="text-ink-pink font-semibold">GROUP BY</code>
                  {t(" 子句；你配置的「值指标」则对应 ")}
                  <code className="text-ink-orange font-semibold">SUM()</code>
                  {", "}
                  <code className="text-ink-orange font-semibold">AVG()</code>
                  {", "}
                  <code className="text-ink-orange font-semibold">COUNT(DISTINCT)</code>
                  {t(" 聚合函数。")}
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onModeChange?.('bigdata')}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-[#66D9EF]/15 border border-[#66D9EF]/30 text-ink-cyan font-bold hover:bg-[#66D9EF]/25 transition"
                  >
                    <span>{t("查看当前透视自动生成的 SQL 模板 ➔")}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeDataSourceModal === 'bigdata' && (
            <div className="space-y-4 animate-apple-fade-in">
              <div className="space-y-2">
                <p className="text-ink-muted dark:text-[#B8B5A8] leading-relaxed text-[11px]">
                  {t("生成本地合成数据用于 UI 性能检查。超过") + ' '}{duckdbThreshold.toLocaleString()}{' ' + t("行仍由 JavaScript 计算；未接入 DuckDB 运行时。")}
                </p>

                {/* Scale Selector */}
                <div className="p-3 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/60 space-y-2">
                  <div className="font-bold text-xs apple-font-mono text-[#272822] dark:text-[#F8F8F2]">
                    {t("生成零售业务流水测试数据集：")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        generate100kDataset(1000);
                        onClose();
                        showToast?.('已生成 1,000 行极速体验数据集');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#A6E22E]/40 bg-[#A6E22E]/15 text-ink-green hover:bg-[#A6E22E]/25 font-bold transition apple-font-mono text-xs"
                    >
                      {t("1,000 行 (极速体验)")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        generate100kDataset(10000);
                        onClose();
                        showToast?.('已生成 10,000 行性能测试数据集');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#66D9EF]/40 bg-[#66D9EF]/15 text-ink-cyan hover:bg-[#66D9EF]/25 font-bold transition apple-font-mono text-xs"
                    >
                      {t("10,000 行 (中等规模)")}
                    </button>
                    <button
                      onClick={() => generate100kDataset(100000)}
                      className="rounded-lg bg-[#AE81FF] text-[#1E1F1C] font-bold px-3.5 py-1.5 shadow-xs hover:bg-[#BE96FF] transition apple-font-mono text-xs"
                    >
                      {t("生成 100,000 行合成数据")}
                    </button>
                  </div>
                  <div className="text-[10px] text-ink-muted leading-tight">
                    {t("包含字段：地区、城市、渠道、品类、商品名、会员类型、月份、销售额、利润、折扣、销售量。")}
                  </div>
                </div>
              </div>

              {/* SQL Template Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs apple-font-mono text-[#272822] dark:text-[#F8F8F2]">
                    {t("DuckDB SQL 模板（不执行）")}
                  </span>
                  <button
                    onClick={() => copyTextToClipboard(generateDuckDBPivotSQL(currentDataset, pivotConfig), 'SQL 模板已复制')}
                    className="rounded-md border border-[#D6D4C8] dark:border-[#49483E] px-2.5 py-1 hover:border-[#66D9EF] text-[10.5px] apple-font-mono transition"
                  >
                    {t("复制模板")}
                  </button>
                </div>
                <pre
                  tabIndex={0}
                  role="region"
                  aria-label={t('DuckDB SQL 模板（不执行）')}
                  className="ps-dark-surface max-h-52 overflow-auto whitespace-pre-wrap rounded-xl bg-[#191A17] text-ink-yellow p-3 text-[11px] border border-[#3E3D32] apple-font-mono"
                >
                  {generateDuckDBPivotSQL(currentDataset, pivotConfig)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
