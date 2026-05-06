import * as OpenCC from 'opencc-js';

let initialized = false;

export function initLanguageSystem() {
  if (initialized) return;
  initialized = true;

  const saved = localStorage.getItem('app_language');
  let lang = saved;
  if (!lang) {
    const browserLang = navigator.language.toLowerCase();
    lang = browserLang.includes('tw') || browserLang.includes('hk') || browserLang.includes('hant') ? 'tw' : 'cn';
    localStorage.setItem('app_language', lang);
  }

  if (lang === 'cn') return; // default is 'cn'

  const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

  const convertNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      const converted = converter(node.nodeValue);
      if (converted !== node.nodeValue) {
        // Prevent observation loops
        const orig = node.nodeValue;
        node.nodeValue = converted;
        (node as any)._origValue = orig;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      // Skip logic for performance
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.classList?.contains('ignore-lang')) return;
      
      const attrs = ['placeholder', 'title', 'alt', 'aria-label'];
      attrs.forEach(attr => {
        if (el.hasAttribute(attr)) {
           const val = el.getAttribute(attr);
           if (val) {
              const converted = converter(val);
              if (converted !== val) el.setAttribute(attr, converted);
           }
        }
      });
      node.childNodes.forEach(convertNode);
    }
  };

  // Run initial conversion next tick to allow React setup
  setTimeout(() => {
    convertNode(document.body);
    
    // We disconnect before converting and reconnect to avoid infinite loops 
    // when we manually modify the characterData, though the condition checks avoid loop.
    let isConverting = false;

    const observer = new MutationObserver((mutations) => {
        if (isConverting) return;
        isConverting = true;
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(convertNode);
          if (mutation.type === 'characterData' && mutation.target.nodeValue) {
            // Check if we just converted it
            if ((mutation.target as any)._origValue && (mutation.target as any)._origValue !== mutation.target.nodeValue && mutation.target.nodeValue === converter((mutation.target as any)._origValue)) {
                return;
            }
            
            const converted = converter(mutation.target.nodeValue);
            if (converted !== mutation.target.nodeValue) {
              const orig = mutation.target.nodeValue;
              mutation.target.nodeValue = converted;
              (mutation.target as any)._origValue = orig;
            }
          }
        });
        isConverting = false;
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }, 0);
}

export function toggleLanguage() {
  const current = localStorage.getItem('app_language') || 'cn';
  localStorage.setItem('app_language', current === 'cn' ? 'tw' : 'cn');
  window.location.reload();
}

export function getCurrentLanguage(): 'cn' | 'tw' {
    const saved = localStorage.getItem('app_language');
    if (saved === 'tw') return 'tw';
    return 'cn'; // default fast path if not set, handled by init
}
