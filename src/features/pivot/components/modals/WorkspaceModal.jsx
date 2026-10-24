import { t } from '../../../../i18n.js';
import React, { useState } from 'react';
import { createShareLink } from '../../../../utils/viewConfig';
import { useDialogFocus } from '../../../../utils/useDialogFocus';
import { FolderOpen, X, Share2, Download, UserCheck, Shield, Layers, HelpCircle, FileCheck } from 'lucide-react';

export function WorkspaceModal({
  isOpen,
  restorePivotConfig,
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
  tableSettings,
  setTableSettings,
  applyShareTokenPayload,
  copyTextToClipboard,
  showToast,
}) {
  const dialogRef = useDialogFocus(Boolean(isOpen), onClose);
  if (!isOpen) return null;

  const currentDatasetObj = datasets.find((d) => d.id === activeDatasetId);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 animate-apple-fade-in"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("本机工作区与配置分享")}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden flex flex-col max-h-[86vh] animate-apple-modal"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between shrink-0">
          <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-ink-pink" />
            <span>{t("WORKSPACE_HUB // 本机快照与配置分享")}</span>
          </h3>
          <button
            onClick={onClose}
            aria-label={t("关闭本机工作区与配置分享")}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-muted hover:text-[#F92672] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs apple-font-mono flex-1">
          {/* Section 1: Role Switcher */}
          <div className="p-3.5 rounded-xl bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-[#272822] dark:text-[#F8F8F2]">
                <UserCheck className="w-3.5 h-3.5 text-ink-green" />
                <span>{t("本机角色演示（不是身份认证）:")}</span>
              </div>
              <div className="flex gap-1.5">
                {[
                  { id: 'usr_admin', name: '张工 (BI架构师)', role: 'Admin', desc: '全权编辑与计算' },
                  { id: 'usr_viewer', name: '访客预览账户 (只读)', role: 'Viewer', desc: '只读沉浸式阅览' },
                ].map((u) => (
                  <button
                    key={u.role}
                    type="button"
                    onClick={() => {
                      setCurrentUser(u);
                      showToast?.(`已切换身份为：${u.name}`);
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition ${
                      currentUser.role === u.role
                        ? 'bg-action text-[#F8F8F2] border-[#F92672] shadow-xs'
                        : 'border-[#D6D4C8] dark:border-[#3E3D32] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                    }`}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-ink-muted leading-relaxed">
              {t("💡 提示：用于体验不同用户视角的权限控制。架构师角色可任意调整维度与公式；访客角色展示锁定状态，适合向业务汇报时演示。")}
            </p>
          </div>

          {/* Section 2: Local Workspace Snapshots */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-ink-green text-xs">
                {t("保存或切换本机工作区快照 (")}{savedWorkspaces.length})
              </div>
              <span className="text-[10px] text-ink-muted">{t("保存在当前浏览器本地存储")}</span>
            </div>

            {/* Save snapshot input group */}
            <div className="flex gap-2">
              <input
                type="text"
                disabled={isReadOnly}
                maxLength={128}
                value={newWorkspaceNameInput}
                onChange={(e) => setNewWorkspaceNameInput(e.target.value)}
                placeholder={t("输入新工作区快照名称...")}
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-xs apple-font-mono focus:outline-none focus:border-[#A6E22E]"
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
                    datasetName: currentDatasetObj?.name || '零售数据集',
                    viewMode,
                    chartType,
                    condFormat,
                    chartSpecConfig,
                    pivotConfig,
                    tableSettings,
                  };
                  setSavedWorkspaces((prev) => [snap, ...prev]);
                  setActiveWorkspaceId(snap.id);
                  setNewWorkspaceNameInput('');
                  showToast?.(`已保存工作区快照「${name}」`);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#A6E22E] text-[#1E1F1C] font-bold text-xs shadow-xs hover:bg-[#B8F03E] transition disabled:opacity-40"
              >
                {' ' + t("保存快照") + ' '}
              </button>
            </div>

            {/* Snapshot list */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
              {savedWorkspaces.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-[#D6D4C8] dark:border-[#3E3D32] text-center text-ink-muted dark:text-[#B8B5A8] text-[11px] space-y-1">
                  <div>{t("暂无保存的工作区快照")}</div>
                  <div className="text-[10.5px] text-[#555245] dark:text-[#A8A598]">{t("完成一组透视分析后，在上方输入名称并点击「保存快照」，即可保留多套分析视角供汇报切换。")}</div>
                </div>
              ) : (
                savedWorkspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                      activeWorkspaceId === ws.id
                        ? 'bg-[#A6E22E]/10 border-[#A6E22E]/50'
                        : 'bg-[#EFECE1]/40 dark:bg-[#1E1F1C] border-[#D6D4C8] dark:border-[#3E3D32]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate text-xs flex items-center gap-1.5">
                        <span className="truncate">{ws.name}</span>
                        {ws.chartType && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#66D9EF]/15 text-ink-cyan border border-[#66D9EF]/30 shrink-0">
                            {ws.chartType}
                          </span>
                        )}
                        {ws.datasetName && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#FD971F]/15 text-ink-orange border border-[#FD971F]/30 shrink-0 truncate max-w-[120px]">
                            {ws.datasetName}
                          </span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-ink-muted mt-0.5">
                        {ws.updatedAt} · {ws.author}
                      </div>
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
                          if (ws.pivotConfig) {
                            restorePivotConfig(ws.pivotConfig, Boolean(ws.datasetId && datasets.some((d) => d.id === ws.datasetId)));
                          }
                          if (ws.tableSettings && setTableSettings) setTableSettings(ws.tableSettings);
                          setActiveWorkspaceId(ws.id);
                          onClose();
                          showToast?.(`已加载工作区「${ws.name}」`);
                        }}
                        className="px-2.5 py-1 rounded-md bg-[#66D9EF]/20 text-ink-cyan text-[10px] font-bold hover:bg-[#66D9EF]/30 transition"
                      >
                        {' ' + t("载入") + ' '}
                      </button>
                      {!isReadOnly && (
                        <button
                          onClick={() => {
                            setSavedWorkspaces((prev) => prev.filter((x) => x.id !== ws.id));
                            showToast?.('已移除该工作区快照');
                          }}
                          className="px-2 py-1 rounded-md bg-[#F92672]/15 text-ink-pink text-[10px] hover:bg-[#F92672]/25 transition"
                        >
                          {' ' + t("删除") + ' '}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 3: Share View Config */}
          <div className="space-y-2 border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-3.5">
            <div className="font-bold text-ink-cyan flex items-center justify-between">
              <span>{t("分享视图配置（不包含数据）")}</span>
              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#A6E22E]/15 text-ink-green font-normal">
                安全且保护源数据隐私
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-ink-muted">
              {t("配置链接使用 Base64，不是加密或鉴权。打开链接后请自行加载字段匹配的数据。工作区快照保存在本机浏览器，不同步到服务器。")}
            </p>
            {(() => {
              let shareLink;
              try {
                shareLink = createShareLink(
                  { vm: viewMode, ct: chartType, cf: condFormat, csc: chartSpecConfig, fullConfig: pivotConfig, ts: tableSettings },
                  window.location
                );
              } catch (error) {
                return <p role="alert">{error.message}</p>;
              }
              const iframeCode = `<iframe src="${shareLink}" width="100%" height="680" frameborder="0" style="border-radius:12px;border:1px solid #3E3D32;"></iframe>`;
              return (
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      aria-label={t("分享配置链接")}
                      readOnly
                      value={shareLink}
                      className="flex-1 px-2.5 py-1 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[10px] apple-font-mono select-all"
                    />
                    <button
                      onClick={() => copyTextToClipboard(shareLink, '已复制 Base64 配置链接（非加密）')}
                      className="px-3 py-1 rounded-lg bg-[#66D9EF] text-[#1E1F1C] font-bold text-[10px] hover:bg-[#7AE2F8] transition"
                    >
                      {' ' + t("复制链接") + ' '}
                    </button>
                    <button
                      onClick={() => copyTextToClipboard(iframeCode, '已复制 Iframe 嵌入代码')}
                      className="px-3 py-1 rounded-lg bg-[#AE81FF] text-[#1E1F1C] font-bold text-[10px] hover:bg-[#BE96FF] transition"
                    >
                      {' ' + t("复制 Iframe") + ' '}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={180000}
                      value={shareTokenInput}
                      onChange={(e) => setShareTokenInput(e.target.value)}
                      placeholder={t("在此粘贴分享链接或 Share Token 一键还原视图...")}
                      className="flex-1 px-2.5 py-1 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[10px] apple-font-mono focus:outline-none focus:border-[#F92672]"
                    />
                    <button
                      onClick={() => {
                        if (applyShareTokenPayload(shareTokenInput)) {
                          setShareTokenInput('');
                          onClose();
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-action text-[#F8F8F2] font-bold text-[10px] hover:opacity-90 transition"
                    >
                      {' ' + t("还原视图") + ' '}
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
