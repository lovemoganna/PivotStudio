import React from 'react';
import {
  Terminal, Award, Lock, Search, Zap, Film, CheckCircle2, Palette,
  FolderOpen, Volume2, VolumeX, Sun, Moon, SkipBack, SkipForward, AlertCircle, X
} from 'lucide-react';
import { KEYNOTE_STORYBOARD_SHOTS } from '../../../constants/pivotConstants';

export function HeaderBar({
  darkMode,
  setDarkMode,
  soundEnabled,
  setSoundEnabled,
  soundEngine,
  keynotePlaying,
  setKeynotePlaying,
  keynoteShotIdx,
  applyKeynoteShot,
  cinemaTheaterMode,
  setCinemaTheaterMode,
  shotProgressPct,
  pivotResult,
  currentUser,
  isReadOnly,
  viewMode,
  isPrintingReport,
  setShowAwardBadgeModal,
  setShowCommandPalette,
  setCommandQuery,
  setShowTestSuiteModal,
  setActiveFormatModal,
  setShowWorkspaceModal,
  liveEngineTestResults,
  exportToExcelMerged,
  exportToCSV,
  exportChartAsPNG,
  exportPDFReport,
  showToast,
  toastMessage,
  setToastMessage,
}) {
  const activeKeynoteShot = KEYNOTE_STORYBOARD_SHOTS[keynoteShotIdx] || KEYNOTE_STORYBOARD_SHOTS[0];

  return (
    <>
      {/* Monokai Pro Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-10 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-2xl border bg-[#272822]/95 text-[#F8F8F2] border-[#F92672]/50 backdrop-blur-2xl animate-apple-modal max-w-md">
          {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-[#F92672] shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-[#A6E22E] shrink-0" />}
          <span className="text-[11px] font-medium tracking-tight leading-snug apple-font-mono">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-1 p-0.5 rounded text-[#75715E] hover:text-[#F8F8F2] hover:bg-white/10 transition" aria-label="关闭通知"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Top Monokai Pro IDE Header Bar */}
      <header className="min-h-13 py-2 bg-[#EFECE1]/90 dark:bg-[#272822]/95 backdrop-blur-2xl border-b border-[#D6D4C8] dark:border-[#3E3D32] px-4 flex flex-wrap items-center justify-between gap-2.5 shrink-0 print:hidden z-30 relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#F92672] via-[#FD971F] via-[#E6DB74] via-[#A6E22E] via-[#66D9EF] to-[#AE81FF]" />

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1E1F1C] border border-[#3E3D32] flex items-center justify-center text-[#F92672] shadow-sm shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F92672]/20 via-transparent to-[#66D9EF]/20" />
            <Terminal className="w-4 h-4 text-[#F92672] relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[13px] font-bold tracking-tight apple-font-mono flex items-center gap-1">
                <span className="text-[#F92672]">const</span>
                <span className="text-[#272822] dark:text-[#A6E22E]">PivotStudio</span>
                <span className="text-[#75715E]">=</span>
                <span className="text-[#948400] dark:text-[#E6DB74]">&quot;Monokai.Pro&quot;</span>
              </h1>
              <button
                onClick={() => { soundEngine?.playClick(620); setShowAwardBadgeModal(true); }}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-[#AE81FF]/15 text-[#6B38FB] dark:text-[#AE81FF] border border-[#AE81FF]/35 font-semibold apple-font-mono hover:scale-105 apple-transition"
                title="查看 Awwwards / Webby / FWA 视觉架构与工程规范"
              >
                <Award className="w-3 h-3 text-[#FD971F]" />
                <span>SOTD_SPEC</span>
              </button>
              {isReadOnly && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-[#FD971F]/15 text-[#FD971F] font-semibold border border-[#FD971F]/35 apple-font-mono">
                  <Lock className="w-2.5 h-2.5" />
                  <span>READ_ONLY (Viewer)</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#75715E] dark:text-[#908E80] hidden sm:block leading-tight mt-0.5 apple-font-mono">
              // #272822 Obsidian Canvas · Crosshair Telemetry · 96 BPM Keynote Stage
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { soundEngine?.playClick(640); setShowCommandPalette(true); setCommandQuery(''); }}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#FFFDF7] dark:bg-[#1E1F1C] hover:border-[#66D9EF] border border-[#D6D4C8] dark:border-[#3E3D32] text-[11px] text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2] apple-transition"
            title="打开全局指令面板 (⌘K / Ctrl+K)" aria-label="打开指令面板"
          >
            <Search className="w-3 h-3 text-[#66D9EF]" />
            <span className="hidden md:inline apple-font-mono">cmd_palette()</span>
            <kbd className="px-1.5 py-0.2 rounded bg-[#EFECE1] dark:bg-[#272822] text-[9px] font-semibold text-[#F92672] border border-[#D6D4C8] dark:border-[#49483E] apple-font-mono">⌘K</kbd>
          </button>

          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[11px] text-[#75715E] dark:text-[#908E80] apple-font-mono">
            <Zap className="w-3.5 h-3.5 text-[#FD971F] shrink-0" />
            <span>rows: <strong className="text-[#6B38FB] dark:text-[#AE81FF] font-semibold">{pivotResult.filteredCount.toLocaleString()}</strong>/{pivotResult.totalCount.toLocaleString()}</span>
            <span className="text-[#49483E]">|</span>
            <span>time: <strong className="text-[#528000] dark:text-[#A6E22E] font-semibold">{pivotResult.elapsedMs}ms</strong></span>
          </div>

          <div className="flex items-center bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg p-0.5">
            <button
              onClick={() => {
                const nextState = !keynotePlaying;
                setKeynotePlaying(nextState);
                if (nextState) {
                  applyKeynoteShot(keynoteShotIdx);
                  showToast?.('已开启 Monokai Keynote 96 BPM 叙事运镜演示');
                } else {
                  soundEngine?.playClick(440);
                  showToast?.('已暂停 Keynote 自动运镜，可自由交互');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold apple-font-mono apple-transition ${keynotePlaying ? 'bg-[#F92672] text-[#F8F8F2] shadow-sm' : 'text-[#272822] dark:text-[#F8F8F2] hover:bg-[#3E3D32]/30'}`}
              title="开启 96 BPM 分镜运镜模式"
            >
              {keynotePlaying ? (
                <span className="flex items-end gap-0.5 h-3 mr-0.5">
                  <span className="w-0.5 bg-[#E6DB74] rounded-full" style={{ animation: 'eqPulse1 0.625s infinite ease-in-out' }} />
                  <span className="w-0.5 bg-[#A6E22E] rounded-full" style={{ animation: 'eqPulse2 0.625s infinite ease-in-out' }} />
                  <span className="w-0.5 bg-[#66D9EF] rounded-full" style={{ animation: 'eqPulse3 0.625s infinite ease-in-out' }} />
                </span>
              ) : (
                <Film className="w-3 h-3 text-[#F92672]" />
              )}
              <span>{keynotePlaying ? `KEYNOTE [${activeKeynoteShot.number}]` : 'Keynote 演示'}</span>
            </button>
            <button
              onClick={() => {
                soundEngine?.playClick(560);
                setCinemaTheaterMode((p) => !p);
              }}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold apple-font-mono transition ${cinemaTheaterMode ? 'bg-[#A6E22E] text-[#1E1F1C]' : 'text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2]'}`}
              title="切换纯净剧院舞台模式 (快捷键: T)"
            >
              剧院舞台
            </button>
          </div>

          <button onClick={() => { soundEngine?.playClick(640); setShowTestSuiteModal(true); }} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FFFDF7] dark:bg-[#1E1F1C] hover:border-[#A6E22E] text-[#272822] dark:text-[#F8F8F2] border border-[#D6D4C8] dark:border-[#3E3D32] text-[11px] font-medium apple-font-mono apple-transition">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#A6E22E]" />
            <span>内置校验({liveEngineTestResults.filter((r) => r.passed).length}/5)</span>
          </button>

          <button onClick={() => { soundEngine?.playClick(580); setActiveFormatModal(true); }} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FFFDF7] dark:bg-[#1E1F1C] hover:border-[#FD971F] text-[#272822] dark:text-[#F8F8F2] border border-[#D6D4C8] dark:border-[#3E3D32] text-[11px] font-medium apple-transition">
            <Palette className="w-3.5 h-3.5 text-[#FD971F]" />
            <span>格式与数值</span>
          </button>

          <div className="flex items-center bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg p-0.5 apple-font-mono">
            <button onClick={exportToExcelMerged} title="导出真正的 Excel 工作簿 (.xlsx)" className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#3E3D32]/20 dark:hover:bg-[#3E3D32] text-[10px] text-[#272822] dark:text-[#A6E22E] font-semibold transition"><span>.XLSX</span></button>
            <button onClick={exportToCSV} title="导出 CSV 数据表 (.csv)" className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#3E3D32]/20 dark:hover:bg-[#3E3D32] text-[10px] text-[#272822] dark:text-[#66D9EF] font-semibold transition"><span>.CSV</span></button>
            <button
              disabled={viewMode === 'table'}
              onClick={exportChartAsPNG}
              title={viewMode === 'table' ? '当前为「仅透视表」模式，请切换至「表图并列」或「仅图表」视图导出图表' : '导出图表：通常 SVG；漏斗图 PNG'}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition ${
                viewMode === 'table'
                  ? 'opacity-35 cursor-not-allowed text-[#75715E]'
                  : 'hover:bg-[#3E3D32]/20 dark:hover:bg-[#3E3D32] text-[#272822] dark:text-[#FD971F]'
              }`}
            >
              <span>图表</span>
            </button>
            <button onClick={exportPDFReport} title="打开打印窗口，可选择另存为 PDF" className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#3E3D32]/20 dark:hover:bg-[#3E3D32] text-[10px] text-[#272822] dark:text-[#AE81FF] font-semibold transition"><span>.PDF</span></button>
          </div>

          <button onClick={() => { soundEngine?.playClick(600); setShowWorkspaceModal(true); }} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F92672] hover:bg-[#FF3B85] text-[#F8F8F2] text-[11px] font-semibold shadow-sm apple-transition" title="本地工作区快照、演示角色与分享配置">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>工作区 · {currentUser.name.split(' ')[0]}</span>
          </button>

          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) {
                if (soundEngine) soundEngine.enabled = true;
                soundEngine?.playClick(660);
              }
            }}
            title={soundEnabled ? '微交互声效已开启 (点击静音)' : '微交互声效已静音 (点击开启)'}
            className="p-1.5 rounded-lg bg-[#FFFDF7] dark:bg-[#1E1F1C] hover:border-[#66D9EF] text-[#272822] dark:text-[#F8F8F2] border border-[#D6D4C8] dark:border-[#3E3D32] transition"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#A6E22E]" /> : <VolumeX className="w-3.5 h-3.5 text-[#75715E]" />}
          </button>

          <button onClick={() => { soundEngine?.playClick(480); setDarkMode((prev) => !prev); }} title={darkMode ? '当前：Monokai Pro Dark (点击切换暖纸浅色)' : '当前：Monokai Light (点击切换经典暗色)'} className="p-1.5 rounded-lg bg-[#FFFDF7] dark:bg-[#1E1F1C] hover:border-[#E6DB74] text-[#272822] dark:text-[#F8F8F2] border border-[#D6D4C8] dark:border-[#3E3D32] transition" aria-label="切换主题">
            {darkMode ? <Sun className="w-3.5 h-3.5 text-[#E6DB74]" /> : <Moon className="w-3.5 h-3.5 text-[#AE81FF]" />}
          </button>
        </div>
      </header>

      {/* Keynote Director Stage HUD */}
      {(keynotePlaying || cinemaTheaterMode) && (
        <div className="bg-[#191A17] text-[#F8F8F2] px-6 py-3 border-b border-[#3E3D32] flex flex-col gap-2 animate-apple-stage print:hidden relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="px-2.5 py-1 rounded bg-[#F92672] text-[#F8F8F2] text-[10px] apple-font-mono font-bold tracking-wider uppercase shadow-sm">
                SHOT {activeKeynoteShot.number} · 96 BPM
              </span>
              <div>
                <div className="text-xs font-semibold tracking-tight flex items-center gap-2">
                  <span className="text-[#E6DB74] apple-font-mono">{activeKeynoteShot.title}</span>
                  <span className="text-[10px] text-[#66D9EF] font-normal hidden md:inline apple-font-mono">// {activeKeynoteShot.cameraNote}</span>
                </div>
                <div className="text-[10px] text-[#75715E] apple-font-mono">{activeKeynoteShot.subtitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => applyKeynoteShot(keynoteShotIdx - 1)}
                className="p-1.5 rounded bg-[#272822] hover:bg-[#3E3D32] border border-[#49483E] text-[#F8F8F2] transition"
                title="上一分镜 (快捷键: [)"
              >
                <SkipBack className="w-3.5 h-3.5 text-[#66D9EF]" />
              </button>
              <div className="flex items-center gap-1.5 px-2">
                {KEYNOTE_STORYBOARD_SHOTS.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => applyKeynoteShot(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold apple-font-mono transition flex items-center justify-center border ${keynoteShotIdx === idx ? 'bg-[#F92672] text-[#F8F8F2] border-[#F92672] shadow-sm' : 'bg-[#272822] text-[#75715E] border-[#49483E] hover:text-[#F8F8F2] hover:border-[#66D9EF]'}`}
                  >
                    {s.number}
                  </button>
                ))}
              </div>
              <button
                onClick={() => applyKeynoteShot(keynoteShotIdx + 1)}
                className="p-1.5 rounded bg-[#272822] hover:bg-[#3E3D32] border border-[#49483E] text-[#F8F8F2] transition"
                title="下一分镜 (快捷键: ])"
              >
                <SkipForward className="w-3.5 h-3.5 text-[#66D9EF]" />
              </button>
            </div>
          </div>
          {keynotePlaying && (
            <div className="w-full bg-[#272822] h-1 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#F92672] via-[#FD971F] to-[#A6E22E] transition-all duration-100 ease-linear" style={{ width: `${shotProgressPct}%` }} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
