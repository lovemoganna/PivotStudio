import React, { useState } from 'react';
import { Globe, Server, Zap, X } from 'lucide-react';
import { parseCSVTextToSheet } from '../../../../utils/csvParser';
import { generateDuckDBPivotSQL } from '../../../../services/duckdbQuery';

export function DataSourceModal({
  activeDataSourceModal, onClose, gsheetUrlInput, setGsheetUrlInput,
  duckdbThreshold, currentDataset, pivotConfig,
  setDatasets, setActiveDatasetId, setPivotConfig, generate100kDataset,
  copyTextToClipboard, showToast
}) {
  const [loading, setLoading] = useState(false);
  if (!activeDataSourceModal) return null;

  async function importPublicSheet() {
    const match = gsheetUrlInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) { showToast?.('请输入有效的 Google Sheets 链接', 'error'); return; }
    const id = match[1];
    const gid = gsheetUrlInput.match(/(?:[?#&]gid=)(\d+)/)?.[1] || '0';
    setLoading(true);
    try {
      const url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/export?format=csv&gid=' + encodeURIComponent(gid);
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const csv = await res.text();
      if (/^\s*<!doctype html|^\s*<html/i.test(csv)) throw new Error('返回了登录或权限页面');
      const sheet = parseCSVTextToSheet(csv, 'Google Sheets');
      if (!sheet?.rows.length) throw new Error('未发现有效 CSV 数据');
      const rows = sheet.rows.map((row) => {
        const normalized = { ...row };
        sheet.fields.forEach((field) => {
          const raw = String(row[field.name] ?? '').trim();
          if (field.type === 'number') normalized[field.name] = raw ? Number(raw.replace(/,/g, '')) : null;
          if (field.type === 'boolean') normalized[field.name] = /^(true|1|是|yes)$/i.test(raw);
        });
        return normalized;
      });
      const ds = {
        id: 'ds_google_' + Date.now(),
        name: 'Google Sheets ' + id.slice(0, 8) + ' (' + rows.length + ' 行)',
        fields: sheet.fields,
        rows
      };
      setDatasets((prev) => [...prev, ds]);
      setActiveDatasetId(ds.id);
      setPivotConfig({
        rows: sheet.fields.filter((f) => f.type === 'text').slice(0, 1).map((f) => ({id:'r_auto',field:f.name})),
        columns: [],
        values: sheet.fields.filter((f) => f.type === 'number').slice(0, 1).map((f) => ({id:'v_auto',field:f.name,agg:'sum',showAs:'normal'})),
        filters: [], collapsedRowKeys: {}, collapsedColKeys: {}, showSubtotals: false
      });
      onClose();
      showToast?.('已读取真实公开数据：' + rows.length + ' 行');
    } catch (err) {
      showToast?.('导入失败：' + err.message + '。请检查公开访问权限、CSV 导出及浏览器跨域限制', 'error');
    } finally { setLoading(false); }
  }

  return (
    <div role="presentation" onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <section role="dialog" aria-modal="true" aria-label="数据源管理" onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl text-xs">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 px-5 py-4 border-b border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822]">
          <div className="flex items-center gap-2 font-bold">
            {activeDataSourceModal === 'gsheet' ? <Globe className="w-4 h-4 text-[#66D9EF]"/> : activeDataSourceModal === 'sql' ? <Server className="w-4 h-4 text-[#FD971F]"/> : <Zap className="w-4 h-4 text-[#AE81FF]"/>}
            {activeDataSourceModal === 'gsheet' ? 'Google Sheets 公开 CSV' : activeDataSourceModal === 'sql' ? 'SQL 数据库 · 未实现' : '本地合成数据 / SQL 模板'}
          </div>
          <button aria-label="关闭数据源" onClick={onClose} className="rounded-md p-1 hover:bg-black/10 dark:hover:bg-white/10"><X className="w-4 h-4"/></button>
        </header>
        <div className="p-5 space-y-4">
          {activeDataSourceModal === 'gsheet' && (
            <>
              <p className="leading-relaxed text-[#75715E] dark:text-[#B8B5A8]">仅支持可公开导出 CSV 的工作表；私有 OAuth、定时同步和完整工作簿同步尚未实现。失败时不会使用演示数据替代。</p>
              <label htmlFor="gsheet-url" className="block font-semibold">Google Sheets 链接（可指定 gid）</label>
              <input id="gsheet-url" value={gsheetUrlInput} onChange={(e) => setGsheetUrlInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0" className="w-full rounded-md px-3 py-2 border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C]"/>
              <div className="flex justify-end"><button disabled={loading} onClick={importPublicSheet} className="rounded-md bg-[#66D9EF] px-4 py-2 text-[#1E1F1C] font-bold disabled:opacity-50">{loading ? '正在请求真实数据…' : '读取公开工作表'}</button></div>
            </>
          )}
          {activeDataSourceModal === 'sql' && (
            <div role="status" className="space-y-3 rounded-lg border border-[#FD971F]/40 bg-[#FD971F]/10 px-4 py-4 leading-relaxed">
              <p className="font-bold text-[#C86400] dark:text-[#FD971F]">数据库连接及 SQL 查询尚未实现</p>
              <p>当前仓库没有数据库代理、服务器认证或真实 SQL 执行。此界面不再提供伪连接按钮或返回内置数据冒充查询结果。</p>
              <p>接入前须建立安全的只读服务端代理、SQL 校验、超时控制与错误处理。</p>
            </div>
          )}
          {activeDataSourceModal === 'bigdata' && (
            <>
              <p className="text-[#75715E] dark:text-[#B8B5A8] leading-relaxed">生成本地合成数据用于 UI 性能检查。超过 {duckdbThreshold.toLocaleString()} 行仍由 JavaScript 计算；未接入 DuckDB 运行时。</p>
              <button onClick={() => generate100kDataset(100000)} className="rounded-md bg-[#AE81FF] text-[#1E1F1C] font-bold px-4 py-2">生成 100,000 行合成数据</button>
              <div className="flex items-center justify-between gap-2"><span className="font-semibold">DuckDB SQL 模板（不执行）</span><button onClick={() => copyTextToClipboard(generateDuckDBPivotSQL(currentDataset, pivotConfig), 'SQL 模板已复制')} className="rounded-md border border-[#49483E] px-3 py-1.5 hover:border-[#66D9EF]">复制模板</button></div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-[#191A17] text-[#E6DB74] p-3 text-[11px]">{generateDuckDBPivotSQL(currentDataset, pivotConfig)}</pre>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
