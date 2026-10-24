import React, {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {useDialogFocus} from '../../../utils/useDialogFocus';
import {t} from '../../../i18n';

// Fullscreen must escape animated/scrolling ancestors, which contain fixed children.
export function ChartFrame({fullscreen, onExit, darkMode, style, className, children}) {
  const dialogRef=useDialogFocus(fullscreen,onExit);
  const previous=useRef(fullscreen);
  useEffect(()=>{
    if(previous.current && !fullscreen)requestAnimationFrame(()=>document.querySelector('#pivot-chart-container [data-chart-fullscreen-toggle]')?.focus());
    previous.current=fullscreen;
  },[fullscreen]);
  // Keep source-record dialogs (z-50) above this presentation layer.
  const content=<div id="pivot-chart-container" ref={fullscreen?dialogRef:undefined} role={fullscreen?'dialog':undefined} aria-modal={fullscreen?'true':undefined} aria-label={fullscreen?t('全屏图表'):undefined} tabIndex={fullscreen?-1:undefined} style={fullscreen?{...style,flexBasis:'auto',minHeight:0}:style} className={`${className} text-[#272822] dark:text-[#F8F8F2] ${fullscreen?'fixed inset-4 z-40 shadow-2xl overflow-y-auto':'relative'}`}>{children}</div>;
  return fullscreen?createPortal(<div className={darkMode?'dark':''} data-ui-controls>{content}</div>,document.body):content;
}
