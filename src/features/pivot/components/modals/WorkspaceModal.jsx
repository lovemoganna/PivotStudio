import React from 'react';
import { FolderOpen, X } from 'lucide-react';

export function WorkspaceModal({
  isOpen,
  onClose,
  currentUser,
  setCurrentUser,
  savedWorkspaces,
  setSavedWorkspaces,
  activeWorkspaceId,
  setActiveWorkspaceId,
  newWorkspaceNameInput,
  setNewWorkspaceNameInput,
  shareTokenInput,
  setShareTokenInput,
  isReadOnly,
  activeDatasetId,
  datasets,
  setActiveDatasetId,
  viewMode,
  setViewMode,
  chartType,
  setChartType,
  condFormat,
  setCondFormat,
  chartSpecConfig,
  setChartSpecConfig,
  pivotConfig,
  setPivotConfig,
  applyShareTokenPayload,
  copyTextToClipboard,
  showToast,
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden flex flex-col max-h-[86vh] animate-apple-modal"
      >
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between">
          <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#F92672]" />
            <span>WORKSPACE_HUB // 本机快照与配置分享</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#75715E] hover:text-[#F92672]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto text-xs apple-font-mono">
          <div className="p-3 rounded-xl bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] flex flex-wrap items-center justify-between gap-2">
            <span>本机角色演示（不是身份认证）:</span>
            <div className="flex gap-1.5">
              {[
                { id: 'usr_admin', name: '张工 (BI架构师)', role: 'Admin' },
                { id: 'usr_viewer', name: '访客预览账户 (只读)', role: 'Viewer' },
              ].map((u) => (
                <button
                  key={u.role}
                  onClick={() => {
                    setCurrentUser(u);
                    showToast?.(`已切换身份为：${u.name}`);
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${currentUser.role === u.role ? 'bg-[#F92672] text-[#F8F8F2] border-[#F92672]' : 'border-[#D6D4C8] dark:border-[#3E3D32]'}`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-[#A6E22E]">保存或切换本机工作区快照 ({savedWorkspaces.length})</div>
            <div className="flex gap-2">
              <input
                type="text"
                disabled={isReadOnly}
                value={newWorkspaceNameInput}
                onChange={(e) => setNewWorkspaceNameInput(e.target.value)}
                placeholder="输入新工作区快照名称..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]"
              />
              <button
                disabled={isReadOnly}
                onClick={() => {
                  const name = newWorkspaceNameInput.trim() || `透视快照_${savedWorkspaces.length + 1}`;
                  const snap = {
                    id: `ws_${Date.now()}`,
                    name,
                    updatedAt: new Date().toLocaleString('zh-CN'),
                    author: currentUser.name,
                    datasetId: activeDatasetId,
                    viewMode,
                    chartType,
                    condFormat,
                    chartSpecConfig,
                    pivotConfig,
                  };
                  setSavedWorkspaces((prev) => [snap, ...prev]);
                  setActiveWorkspaceId(snap.id);
                  setNewWorkspaceNameInput('');
                  showToast?.(`已保存工作区快照「${name}」`);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#A6E22E] text-[#1E1F1C] font-bold disabled:opacity-40"
              >
                保存快照
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {savedWorkspaces.map((ws) => (
                <div key={ws.id} className="p-2.5 rounded-lg bg-[#EFECE1]/40 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{ws.name}</div>
                    <div className="text-[9px] text-[#75715E]">{ws.updatedAt} · {ws.author}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        if (ws.datasetId && datasets.some((d) => d.id === ws.datasetId)) {
                          setActiveDatasetId(ws.datasetId);
                        }
                        setViewMode(ws.viewMode || 'split');
                        setChartType(ws.chartType || 'bar');
                        if (ws.condFormat) setCondFormat(ws.condFormat);
                        if (ws.chartSpecConfig) setChartSpecConfig((p) => ({ ...p, ...ws.chartSpecConfig }));
                        if (ws.pivotConfig) setPivotConfig(ws.pivotConfig);
                        setActiveWorkspaceId(ws.id);
                        onClose();
                        showToast?.(`已加载工作区「${ws.name}」`);
                      }}
                      className="px-2.5 py-1 rounded bg-[#66D9EF]/20 text-[#0088A3] dark:text-[#66D9EF] text-[10px] font-bold"
                    >
                      载入
                    </button>
                    {!isReadOnly && savedWorkspaces.length > 1 && (
                      <button
                        onClick={() => setSavedWorkspaces((prev) => prev.filter((x) => x.id !== ws.id))}
                        className="px-2 py-1 rounded bg-[#F92672]/15 text-[#F92672] text-[10px]"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-3">
            <div className="font-bold text-[#66D9EF]">分享视图配置（不包含数据）</div>
            <p className="text-[10px] leading-relaxed text-[#75715E] dark:text-[#908E80]">配置链接使用 Base64，不是加密或鉴权。同一数据集才可正确还原。工作区快照保存在本机浏览器，不同步到服务器。</p>
            {(() => {
              const tokenPayload = btoa(
                unescape(
                  encodeURIComponent(
                    JSON.stringify({
                      vm: viewMode,
                      ct: chartType,
                      cf: condFormat,
                      csc: chartSpecConfig,
                      fullConfig: pivotConfig,
                    })
                  )
                )
              );
              const shareLink = `${window.location.origin}${window.location.pathname}?share_token=${encodeURIComponent(tokenPayload)}`;
              const iframeCode = `<iframe src="${shareLink}" width="100%" height="680" frameborder="0" style="border-radius:12px;border:1px solid #3E3D32;"></iframe>`;
              return (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input readOnly value={shareLink} className="flex-1 px-2.5 py-1 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[10px]" />
                    <button onClick={() => copyTextToClipboard(shareLink, '已复制 Base64 配置链接（非加密）')} className="px-3 py-1 rounded bg-[#66D9EF] text-[#1E1F1C] font-bold text-[10px]">
                      复制链接
                    </button>
                    <button onClick={() => copyTextToClipboard(iframeCode, '已复制 Iframe 嵌入代码')} className="px-3 py-1 rounded bg-[#AE81FF] text-[#1E1F1C] font-bold text-[10px]">
                      复制 Iframe
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareTokenInput}
                      onChange={(e) => setShareTokenInput(e.target.value)}
                      placeholder="在此粘贴分享链接或 Share Token 一键还原视图..."
                      className="flex-1 px-2.5 py-1 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[10px]"
                    />
                    <button
                      onClick={() => {
                        if (applyShareTokenPayload(shareTokenInput)) {
                          setShareTokenInput('');
                          onClose();
                        }
                      }}
                      className="px-3 py-1 rounded bg-[#F92672] text-[#F8F8F2] font-bold text-[10px]"
                    >
                      还原视图
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
