import { t } from '../i18n.js';
import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Intentionally keep error logs formatted
    console.error('PivotEngine Studio ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    try {
      window.localStorage.removeItem('pivotstudio_config_v1');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#1E1F1C] text-[#F8F8F2] apple-font-sans">
          <div className="max-w-lg w-full p-6 rounded-2xl bg-[#272822] border border-[#F92672]/40 shadow-2xl space-y-4 animate-apple-modal">
            <div className="flex items-center gap-2.5 text-[#F92672]">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-base font-bold apple-font-mono">{t("系统自愈保护已拦截异常")}</h2>
            </div>

            <p className="text-xs text-[#75715E] leading-relaxed">{' ' + t("检测到界面渲染过程中出现偶发异常。为了保障您的工作状态与数据安全，系统已自动隔离故障模块。") + ' '}</p>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-[#191A17] border border-[#3E3D32] text-[11px] text-[#FD971F] apple-font-mono overflow-x-auto max-h-40">
                {String(this.state.error?.message || this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#3E3D32]">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-3.5 py-1.5 rounded-lg border border-[#3E3D32] hover:border-[#66D9EF] text-xs font-semibold text-[#66D9EF] transition"
              >{' ' + t("尝试恢复界面") + ' '}</button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#F92672] hover:bg-[#FF3366] text-[#F8F8F2] text-xs font-bold transition shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t("重载工作台")}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
