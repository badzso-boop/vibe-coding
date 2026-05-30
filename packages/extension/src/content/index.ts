const HOST_ID = 'flowspace-widget-host'

function createWidget() {
  if (document.getElementById(HOST_ID)) return

  const host = document.createElement('div')
  host.id = HOST_ID
  Object.assign(host.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    pointerEvents: 'none',
  })

  const shadow = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .widget {
      position: relative;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }

    .tooltip {
      background: #0f172a;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      font-weight: 500;
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.15s ease, transform 0.15s ease;
      text-align: center;
      line-height: 1.6;
    }
    .tooltip .kbd {
      display: block;
      color: #64748b;
      font-size: 10px;
    }
    .widget:hover .tooltip {
      opacity: 1;
      transform: translateY(0);
    }

    .btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #2563eb;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
      opacity: 0.82;
    }
    .btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
      opacity: 1;
    }
    .btn:active {
      transform: scale(0.96);
    }

    .dismiss {
      position: absolute;
      top: -5px;
      right: -5px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #1e293b;
      border: 1px solid rgba(255,255,255,0.12);
      color: #64748b;
      font-size: 9px;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      line-height: 1;
      transition: color 0.1s;
    }
    .dismiss:hover { color: #e2e8f0; }
    .widget:hover .dismiss { display: flex; }
  `
  shadow.appendChild(style)

  const widget = document.createElement('div')
  widget.className = 'widget'

  const tooltip = document.createElement('div')
  tooltip.className = 'tooltip'
  tooltip.appendChild(document.createTextNode('Back to FlowSpace'))
  const kbd = document.createElement('span')
  kbd.className = 'kbd'
  kbd.textContent = 'Ctrl+Shift+D'
  tooltip.appendChild(kbd)

  const btn = document.createElement('button')
  btn.className = 'btn'
  btn.setAttribute('aria-label', 'Back to FlowSpace (Ctrl+Shift+D)')

  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('width', '18')
  svg.setAttribute('height', '18')
  svg.setAttribute('viewBox', '0 0 18 18')
  svg.setAttribute('fill', 'none')
  const rects: Array<[string, string, string, string, string]> = [
    ['1', '1', '7', '7', 'white'],
    ['10', '1', '7', '7', 'rgba(255,255,255,0.45)'],
    ['1', '10', '7', '7', 'rgba(255,255,255,0.45)'],
    ['10', '10', '7', '7', 'white'],
  ]
  for (const [x, y, w, h, fill] of rects) {
    const rect = document.createElementNS(NS, 'rect')
    rect.setAttribute('x', x)
    rect.setAttribute('y', y)
    rect.setAttribute('width', w)
    rect.setAttribute('height', h)
    rect.setAttribute('rx', '1.5')
    rect.setAttribute('fill', fill)
    svg.appendChild(rect)
  }
  btn.appendChild(svg)

  const dismiss = document.createElement('button')
  dismiss.className = 'dismiss'
  dismiss.setAttribute('aria-label', 'Dismiss FlowSpace widget')
  dismiss.textContent = '✕'

  btn.addEventListener('click', openFlowSpace)
  dismiss.addEventListener('click', (e) => {
    e.stopPropagation()
    host.remove()
    sessionStorage.setItem('fs-widget-dismissed', '1')
  })

  widget.appendChild(tooltip)
  widget.appendChild(btn)
  btn.appendChild(dismiss)
  shadow.appendChild(widget)

  document.documentElement.appendChild(host)
}

function openFlowSpace() {
  chrome.runtime.sendMessage({ type: 'OPEN_FLOWSPACE_APP' })
}

// Ctrl+Shift+D — works even if widget is dismissed
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
    e.preventDefault()
    openFlowSpace()
  }
}, true)

// Don't show if already dismissed this session
if (!sessionStorage.getItem('fs-widget-dismissed')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget)
  } else {
    createWidget()
  }
}
