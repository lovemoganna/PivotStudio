import React, {useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

/** Keep dropdowns outside the toolbar's scroll clipping, anchored to their trigger. */
export function ToolbarMenu({anchorRef, label, darkMode, minWidth=148, onClose, children}) {
  const menuRef=useRef(null);
  const [position,setPosition]=useState(null);
  useLayoutEffect(()=>{
    const menu=menuRef.current;
    const place=()=>{
      const anchor=anchorRef.current;
      if (!anchor || !menu) return;
      const r=anchor.getBoundingClientRect();
      const clip=anchor.closest('[role="toolbar"]')?.getBoundingClientRect();
      if (clip && (r.right<=clip.left || r.left>=clip.right)) {onClose();return;}
      const width=menu.getBoundingClientRect().width;
      const height=menu.getBoundingClientRect().height;
      const viewportWidth=document.documentElement.clientWidth;
      const viewportHeight=window.innerHeight;
      const below=r.bottom+6;
      setPosition({
        left:Math.max(8,Math.min(r.right-width,viewportWidth-width-8)),
        top:Math.max(8,below+height<=viewportHeight-8?below:r.top-height-6),
      });
    };
    place();
    const outside=event=>{
      if (!menu?.contains(event.target) && !anchorRef.current?.contains(event.target)) onClose();
    };
    const scroll=event=>{if (!menu?.contains(event.target)) place();};
    document.addEventListener('pointerdown',outside);
    window.addEventListener('resize',place);
    window.addEventListener('scroll',scroll,true);
    return ()=>{
      document.removeEventListener('pointerdown',outside);
      window.removeEventListener('resize',place);
      window.removeEventListener('scroll',scroll,true);
    };
  },[anchorRef,onClose]);
  const placed=Boolean(position);
  useLayoutEffect(()=>{
    if (placed) menuRef.current?.querySelector('[role="menuitem"]:not(:disabled)')?.focus({preventScroll:true});
  },[placed]);

  const keyDown=event=>{
    // Let the global command shortcut open its dialog without a menu above it.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='k') {
      onClose();
      return;
    }
    const items=Array.from(menuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)'));
    const index=items.indexOf(document.activeElement);
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?items.length-1:
        (index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
      items[next]?.focus({preventScroll:true});
    } else if (event.key==='Escape' || event.key==='Tab') {
      if(event.key==='Escape') {event.preventDefault();event.stopPropagation();}
      anchorRef.current?.querySelector('button')?.focus({preventScroll:true});
      onClose();
    }
  };

  return createPortal(
    <div data-ui-controls role="region" aria-label={label} className={darkMode?'dark':''}>
      <div ref={menuRef} role="menu" aria-label={label} onKeyDown={keyDown}
        style={{position:'fixed',zIndex:40,minWidth,maxWidth:'calc(100vw - 16px)',maxHeight:'calc(100dvh - 16px)',overflowY:'auto',left:position?.left??0,top:position?.top??0,opacity:position?1:0,pointerEvents:position?'auto':'none'}}
        className="rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#1E1F1C] shadow-xl p-1">
        {children}
      </div>
    </div>,document.body,
  );
}
